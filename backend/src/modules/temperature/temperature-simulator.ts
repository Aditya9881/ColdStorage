import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { pushNotificationService } from '../notifications/push.service';

/**
 * Temperature Simulator — Dev Mode Only
 * Generates realistic fake sensor data every 30 seconds for all operational chambers.
 * Simulates occasional out-of-range spikes for alert testing.
 */

let simulatorInterval: NodeJS.Timeout | null = null;

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

async function generateReadings() {
  try {
    const chambers = await prisma.chamber.findMany({
      where: { status: 'OPERATIONAL' },
      select: {
        id: true,
        chamberNumber: true,
        facilityId: true,
        targetTempMin: true,
        targetTempMax: true,
        targetHumidityMin: true,
        targetHumidityMax: true,
      },
    });

    if (chambers.length === 0) return;

    const readings = chambers.map((chamber) => {
      const tempMin = chamber.targetTempMin ? Number(chamber.targetTempMin) : 1;
      const tempMax = chamber.targetTempMax ? Number(chamber.targetTempMax) : 5;
      const humMin = chamber.targetHumidityMin ? Number(chamber.targetHumidityMin) : 80;
      const humMax = chamber.targetHumidityMax ? Number(chamber.targetHumidityMax) : 95;

      // 5% chance of generating an out-of-range spike
      const isSpike = Math.random() < 0.05;

      let temperature: number;
      let humidity: number;
      let isAlert = false;

      if (isSpike) {
        // Generate a reading 2-5 degrees outside the range
        const direction = Math.random() < 0.5 ? -1 : 1;
        const offset = randomBetween(2, 5);
        temperature = direction > 0 ? tempMax + offset : tempMin - offset;
        humidity = randomBetween(humMin - 10, humMax + 10);
        isAlert = true;
      } else {
        // Normal reading with slight variation
        temperature = randomBetween(tempMin - 0.5, tempMax + 0.5);
        humidity = randomBetween(humMin, humMax);
        isAlert = temperature < tempMin || temperature > tempMax;
      }

      return {
        chamberId: chamber.id,
        facilityId: chamber.facilityId,
        chamberNumber: chamber.chamberNumber,
        temperature,
        humidity,
        sensorId: `SIM-${chamber.chamberNumber}`,
        isAlert,
        tempMin,
        tempMax,
      };
    });

    // Save readings (without extra fields)
    await prisma.temperatureReading.createMany({
      data: readings.map(({ chamberId, temperature, humidity, sensorId, isAlert }) => ({
        chamberId, temperature, humidity, sensorId, isAlert,
      })),
    });

    // Send push notifications for alerts
    const alertReadings = readings.filter(r => r.isAlert);
    for (const alert of alertReadings) {
      pushNotificationService.sendTemperatureAlert(
        alert.facilityId,
        alert.chamberNumber,
        alert.temperature,
        { min: alert.tempMin, max: alert.tempMax },
      );
    }

    logger.debug(`[TempSim] Generated ${readings.length} readings (${alertReadings.length} alerts)`);
  } catch (err) {
    logger.error('[TempSim] Error generating readings', { error: String(err) });
  }
}

export function startTemperatureSimulator() {
  if (process.env.NODE_ENV !== 'development') {
    logger.info('[TempSim] Skipping — not in development mode');
    return;
  }

  logger.info('[TempSim] Starting temperature simulator (interval: 30s)');

  // Generate initial readings immediately
  generateReadings();

  // Then generate every 30 seconds
  simulatorInterval = setInterval(generateReadings, 30_000);
}

export function stopTemperatureSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
    logger.info('[TempSim] Stopped temperature simulator');
  }
}
