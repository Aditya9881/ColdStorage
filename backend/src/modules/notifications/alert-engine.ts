import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

/**
 * Alert Engine — Background service that periodically checks for alert conditions
 * and creates notifications for relevant users.
 *
 * Runs every 5 minutes in development mode.
 */

let alertInterval: NodeJS.Timeout | null = null;

async function checkAlerts() {
  try {
    await checkTemperatureAlerts();
    await checkLotExpiryWarnings();
    await checkChamberCapacityWarnings();
    logger.debug('[AlertEngine] Alert check completed');
  } catch (err) {
    logger.error('[AlertEngine] Error during alert check', { error: String(err) });
  }
}

/**
 * Check for temperature readings that are out of range
 */
async function checkTemperatureAlerts() {
  const recentAlerts = await prisma.temperatureReading.findMany({
    where: {
      isAlert: true,
      recordedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
    },
    include: {
      chamber: {
        include: {
          facility: { select: { id: true, name: true, ownerId: true } },
        },
      },
    },
  });

  // Group by chamber to avoid duplicate notifications
  const alertsByChamberId = new Map<string, typeof recentAlerts[0]>();
  for (const alert of recentAlerts) {
    if (!alertsByChamberId.has(alert.chamberId)) {
      alertsByChamberId.set(alert.chamberId, alert);
    }
  }

  for (const [, alert] of alertsByChamberId) {
    const temp = Number(alert.temperature);
    const min = alert.chamber.targetTempMin ? Number(alert.chamber.targetTempMin) : null;
    const max = alert.chamber.targetTempMax ? Number(alert.chamber.targetTempMax) : null;

    const rangeStr = min !== null && max !== null ? `${min}–${max}°C` : 'N/A';
    const title = `🌡️ Temperature Alert: ${alert.chamber.chamberNumber}`;
    const message = `Chamber ${alert.chamber.chamberNumber} (${alert.chamber.name || ''}) in ${alert.chamber.facility.name} recorded ${temp.toFixed(1)}°C, outside target range ${rangeStr}.`;

    // Check if we already sent a notification for this chamber in the last hour
    const existing = await prisma.notification.findFirst({
      where: {
        type: 'TEMPERATURE_ALERT',
        metadata: { path: ['chamberId'], equals: alert.chamberId },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (existing) continue;

    // Notify the facility owner
    await prisma.notification.create({
      data: {
        userId: alert.chamber.facility.ownerId,
        type: 'TEMPERATURE_ALERT',
        title,
        message,
        actionUrl: `/wms/monitoring`,
        metadata: { chamberId: alert.chamberId, temperature: temp },
      },
    });

    // Notify facility staff
    const staff = await prisma.user.findMany({
      where: { facilityId: alert.chamber.facilityId, role: 'STAFF', status: 'ACTIVE' },
      select: { id: true },
    });

    for (const s of staff) {
      await prisma.notification.create({
        data: {
          userId: s.id,
          type: 'TEMPERATURE_ALERT',
          title,
          message,
          actionUrl: `/wms/monitoring`,
          metadata: { chamberId: alert.chamberId, temperature: temp },
        },
      });
    }
  }
}

/**
 * Check for lots nearing their expected release date (within 7 days)
 */
async function checkLotExpiryWarnings() {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const lots = await prisma.inventoryLot.findMany({
    where: {
      status: { in: ['STORED', 'PARTIALLY_RELEASED'] },
      expectedRelease: { gte: now, lte: sevenDaysFromNow },
    },
    include: {
      facility: { select: { id: true, name: true, ownerId: true } },
      depositor: { select: { id: true, fullName: true } },
    },
  });

  for (const lot of lots) {
    // Check if we already sent this notification today
    const existing = await prisma.notification.findFirst({
      where: {
        type: 'LOT_EXPIRY_WARNING',
        metadata: { path: ['lotId'], equals: lot.id },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) continue;

    const daysRemaining = Math.ceil((new Date(lot.expectedRelease!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const title = `📦 Lot Release Due Soon: ${lot.lotNumber}`;
    const message = `Lot ${lot.lotNumber} (${lot.commodityName}) deposited by ${lot.depositor?.fullName || 'Unknown'} is due for release in ${daysRemaining} days.`;

    // Notify facility owner
    await prisma.notification.create({
      data: {
        userId: lot.facility.ownerId,
        type: 'LOT_EXPIRY_WARNING',
        title,
        message,
        actionUrl: `/wms/inventory/${lot.id}`,
        metadata: { lotId: lot.id, daysRemaining },
      },
    });
  }
}

/**
 * Check for chambers with capacity > 90%
 */
async function checkChamberCapacityWarnings() {
  const chambers = await prisma.chamber.findMany({
    where: { status: 'OPERATIONAL' },
    include: {
      facility: { select: { id: true, name: true, ownerId: true } },
    },
  });

  for (const chamber of chambers) {
    const capacity = Number(chamber.capacityMt);
    const occupied = Number(chamber.occupiedMt);
    const utilization = capacity > 0 ? (occupied / capacity) * 100 : 0;

    if (utilization < 90) continue;

    // Check if we already sent this notification today
    const existing = await prisma.notification.findFirst({
      where: {
        type: 'CHAMBER_CAPACITY_WARNING',
        metadata: { path: ['chamberId'], equals: chamber.id },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) continue;

    const title = `🏭 Chamber Near Capacity: ${chamber.chamberNumber}`;
    const message = `Chamber ${chamber.chamberNumber} in ${chamber.facility.name} is at ${utilization.toFixed(0)}% capacity (${occupied.toFixed(1)} / ${capacity.toFixed(1)} MT).`;

    await prisma.notification.create({
      data: {
        userId: chamber.facility.ownerId,
        type: 'CHAMBER_CAPACITY_WARNING',
        title,
        message,
        actionUrl: `/wms/facility/chambers`,
        metadata: { chamberId: chamber.id, utilization },
      },
    });
  }
}

export function startAlertEngine() {
  if (process.env.NODE_ENV !== 'development') {
    logger.info('[AlertEngine] Skipping — not in development mode');
    return;
  }

  logger.info('[AlertEngine] Starting alert engine (interval: 5min)');

  // Run initial check after 10s (let temp simulator create some data first)
  setTimeout(checkAlerts, 10_000);

  // Then check every 5 minutes
  alertInterval = setInterval(checkAlerts, 5 * 60 * 1000);
}

export function stopAlertEngine() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
    logger.info('[AlertEngine] Stopped alert engine');
  }
}
