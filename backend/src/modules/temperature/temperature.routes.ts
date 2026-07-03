import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';

const router = Router();

router.use(authenticate);

/**
 * GET /temperature/overview — Latest reading per chamber for the user's facility
 */
router.get('/overview', asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Determine facility scope
  let facilityFilter: any = {};
  if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    facilityFilter = { facilityId: req.user!.facilityId };
  } else if (req.user!.role === UserRole.OWNER) {
    facilityFilter = { facility: { ownerId: req.user!.userId } };
  }

  const facilityId = (req.query.facilityId as string) || undefined;
  if (facilityId) facilityFilter = { facilityId };

  // Get all operational chambers
  const chambers = await prisma.chamber.findMany({
    where: { ...facilityFilter, status: 'OPERATIONAL' },
    include: {
      facility: { select: { id: true, name: true } },
    },
    orderBy: { chamberNumber: 'asc' },
  });

  // Get latest reading per chamber
  const overview = await Promise.all(
    chambers.map(async (chamber) => {
      const latestReading = await prisma.temperatureReading.findFirst({
        where: { chamberId: chamber.id },
        orderBy: { recordedAt: 'desc' },
      });

      // Get last 24 readings for sparkline (roughly one per 30 min for 12 hours)
      const recentReadings = await prisma.temperatureReading.findMany({
        where: {
          chamberId: chamber.id,
          recordedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { recordedAt: 'asc' },
        select: {
          temperature: true,
          humidity: true,
          recordedAt: true,
          isAlert: true,
        },
        take: 48,
      });

      // Determine alert status
      let alertStatus: 'normal' | 'warning' | 'critical' = 'normal';
      if (latestReading) {
        const temp = Number(latestReading.temperature);
        const targetMin = chamber.targetTempMin ? Number(chamber.targetTempMin) : null;
        const targetMax = chamber.targetTempMax ? Number(chamber.targetTempMax) : null;

        if (targetMin !== null && targetMax !== null) {
          const range = targetMax - targetMin;
          const warningBuffer = range * 0.3; // 30% buffer for warning
          if (temp < targetMin - warningBuffer || temp > targetMax + warningBuffer) {
            alertStatus = 'critical';
          } else if (temp < targetMin || temp > targetMax) {
            alertStatus = 'warning';
          }
        }
      }

      return {
        chamber: {
          id: chamber.id,
          chamberNumber: chamber.chamberNumber,
          name: chamber.name,
          capacityMt: chamber.capacityMt,
          occupiedMt: chamber.occupiedMt,
          commodityCategory: chamber.commodityCategory,
          targetTempMin: chamber.targetTempMin,
          targetTempMax: chamber.targetTempMax,
          targetHumidityMin: chamber.targetHumidityMin,
          targetHumidityMax: chamber.targetHumidityMax,
          facility: chamber.facility,
        },
        currentTemperature: latestReading ? Number(latestReading.temperature) : null,
        currentHumidity: latestReading ? (latestReading.humidity ? Number(latestReading.humidity) : null) : null,
        lastUpdated: latestReading?.recordedAt || null,
        alertStatus,
        sparkline: recentReadings.map((r) => ({
          temp: Number(r.temperature),
          humidity: r.humidity ? Number(r.humidity) : null,
          time: r.recordedAt,
          isAlert: r.isAlert,
        })),
      };
    })
  );

  sendSuccess(res, overview);
}));

/**
 * GET /temperature/chambers/:chamberId/history — Historical readings
 */
router.get('/chambers/:chamberId/history', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { chamberId } = req.params;
  const period = (req.query.period as string) || '24h';

  let since: Date;
  switch (period) {
    case '7d':
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '24h':
    default:
      since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
  }

  const readings = await prisma.temperatureReading.findMany({
    where: {
      chamberId: paramString(chamberId),
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: 'asc' },
    select: {
      id: true,
      temperature: true,
      humidity: true,
      sensorId: true,
      isAlert: true,
      recordedAt: true,
    },
  });

  const chamber = await prisma.chamber.findUnique({
    where: { id: paramString(chamberId) },
    select: {
      id: true,
      chamberNumber: true,
      name: true,
      targetTempMin: true,
      targetTempMax: true,
      targetHumidityMin: true,
      targetHumidityMax: true,
      commodityCategory: true,
    },
  });

  sendSuccess(res, {
    chamber,
    period,
    readings: readings.map((r) => ({
      ...r,
      temperature: Number(r.temperature),
      humidity: r.humidity ? Number(r.humidity) : null,
    })),
  });
}));

/**
 * POST /temperature/readings — Ingest sensor data (IoT endpoint)
 * Accepts single reading or batch
 */
router.post('/readings', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { chamberId, temperature, humidity, sensorId, readings } = req.body;

  // Batch insert
  if (readings && Array.isArray(readings)) {
    const data = readings.map((r: any) => ({
      chamberId: r.chamberId,
      temperature: r.temperature,
      humidity: r.humidity,
      sensorId: r.sensorId || null,
      isAlert: r.isAlert || false,
      recordedAt: r.recordedAt ? new Date(r.recordedAt) : new Date(),
    }));

    const result = await prisma.temperatureReading.createMany({ data });
    sendSuccess(res, { count: result.count }, 201);
    return;
  }

  // Single insert
  if (!chamberId || temperature === undefined) {
    errors.badRequest(res, 'chamberId and temperature are required');
    return;
  }

  // Check if temperature is out of range
  const chamber = await prisma.chamber.findUnique({
    where: { id: paramString(chamberId) },
    select: { targetTempMin: true, targetTempMax: true },
  });

  let isAlert = false;
  if (chamber && chamber.targetTempMin !== null && chamber.targetTempMax !== null) {
    const min = Number(chamber.targetTempMin);
    const max = Number(chamber.targetTempMax);
    isAlert = temperature < min || temperature > max;
  }

  const reading = await prisma.temperatureReading.create({
    data: {
      chamberId: paramString(chamberId),
      temperature,
      humidity,
      sensorId: sensorId || null,
      isAlert,
    },
  });

  sendSuccess(res, reading, 201);
}));

export default router;
