/**
 * ColdStorage Backend — MQTT Telemetry Ingestion Module
 *
 * Subscribes to the EMQX MQTT broker and ingests real sensor readings
 * from ESP32/DHT22 devices deployed in cold storage chambers.
 *
 * Topic convention: coldstorage/{facilityId}/{chamberId}/telemetry
 *
 * Payload format (JSON):
 * {
 *   "temperature": 3.4,         // °C
 *   "humidity": 87.2,           // %
 *   "sensorId": "DHT22-A3B1",  // optional
 *   "timestamp": 1720000000000  // ms epoch, optional (uses server time if absent)
 * }
 *
 * In development: falls back to the temperature simulator (no MQTT broker needed).
 * In production: requires MQTT_BROKER_URL environment variable.
 */

import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { pushNotificationService } from '../notifications/push.service';

// Dynamic import of mqtt so the package is optional in dev (avoids crash without broker)
let mqttClient: any = null;
let mqttConnected = false;

/** Topic pattern we subscribe to — matches all facilities / chambers */
const TOPIC = 'coldstorage/+/+/telemetry';

/** Batch flush: accumulate readings for 5s then bulk-insert to reduce DB round trips */
const BATCH_WINDOW_MS = 5_000;
const MAX_BATCH_SIZE = 200;

interface PendingReading {
  chamberId: string;
  temperature: number;
  humidity: number | null;
  sensorId: string | null;
  isAlert: boolean;
  recordedAt: Date;
  facilityId: string;
  chamberNumber?: string;
  targetTempMin?: number | null;
  targetTempMax?: number | null;
}

let pendingBatch: PendingReading[] = [];
let flushTimer: NodeJS.Timeout | null = null;

/** Parse the MQTT topic to extract facilityId and chamberId */
function parseTopic(topic: string): { facilityId: string; chamberId: string } | null {
  const parts = topic.split('/');
  // coldstorage / {facilityId} / {chamberId} / telemetry
  if (parts.length !== 4 || parts[0] !== 'coldstorage' || parts[3] !== 'telemetry') {
    return null;
  }
  return { facilityId: parts[1], chamberId: parts[2] };
}

/** Resolve chamberId from MQTT topic — validates it exists in DB */
async function resolveChamber(chamberId: string) {
  return prisma.chamber.findUnique({
    where: { id: chamberId },
    select: {
      id: true,
      chamberNumber: true,
      facilityId: true,
      targetTempMin: true,
      targetTempMax: true,
    },
  });
}

/** Flush the pending batch to the database */
async function flushBatch() {
  if (pendingBatch.length === 0) return;

  const batch = [...pendingBatch];
  pendingBatch = [];

  try {
    await prisma.temperatureReading.createMany({
      data: batch.map((r) => ({
        chamberId: r.chamberId,
        temperature: r.temperature,
        humidity: r.humidity,
        sensorId: r.sensorId,
        isAlert: r.isAlert,
        recordedAt: r.recordedAt,
      })),
    });

    // Fire push alerts for any out-of-range readings
    const alertReadings = batch.filter((r) => r.isAlert);
    for (const alert of alertReadings) {
      if (alert.targetTempMin !== null && alert.targetTempMax !== null) {
        pushNotificationService.sendTemperatureAlert(
          alert.facilityId,
          alert.chamberNumber || alert.chamberId,
          alert.temperature,
          { min: alert.targetTempMin!, max: alert.targetTempMax! },
        );
      }
    }

    logger.debug(`[MQTT] Flushed ${batch.length} readings (${alertReadings.length} alerts)`);
  } catch (err) {
    logger.error('[MQTT] Failed to flush reading batch', { error: String(err) });
    // Re-queue on failure (drop oldest if over limit to prevent memory leak)
    pendingBatch = [...batch, ...pendingBatch].slice(-MAX_BATCH_SIZE * 2);
  }
}

/** Schedule a flush if not already pending */
function schedulFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushBatch();
  }, BATCH_WINDOW_MS);
}

/** Process an incoming MQTT message */
async function handleMessage(topic: string, payload: Buffer) {
  const ids = parseTopic(topic);
  if (!ids) {
    logger.warn(`[MQTT] Unrecognized topic format: ${topic}`);
    return;
  }

  let data: any;
  try {
    data = JSON.parse(payload.toString());
  } catch {
    logger.warn(`[MQTT] Invalid JSON payload on topic ${topic}`);
    return;
  }

  const temperature = parseFloat(data.temperature);
  if (isNaN(temperature)) {
    logger.warn(`[MQTT] Missing or invalid temperature on topic ${topic}`);
    return;
  }

  // Validate chamber exists (cached lookup would be better at scale)
  const chamber = await resolveChamber(ids.chamberId);
  if (!chamber) {
    logger.warn(`[MQTT] Unknown chamberId "${ids.chamberId}" from topic ${topic}`);
    return;
  }

  const humidity = data.humidity !== undefined ? parseFloat(data.humidity) : null;
  const recordedAt = data.timestamp ? new Date(data.timestamp) : new Date();

  // Determine if reading is out of target range
  let isAlert = false;
  const tMin = chamber.targetTempMin ? Number(chamber.targetTempMin) : null;
  const tMax = chamber.targetTempMax ? Number(chamber.targetTempMax) : null;
  if (tMin !== null && tMax !== null) {
    isAlert = temperature < tMin || temperature > tMax;
  }

  pendingBatch.push({
    chamberId: chamber.id,
    temperature,
    humidity: humidity !== null && !isNaN(humidity) ? humidity : null,
    sensorId: data.sensorId || null,
    isAlert,
    recordedAt,
    facilityId: chamber.facilityId,
    chamberNumber: chamber.chamberNumber,
    targetTempMin: tMin,
    targetTempMax: tMax,
  });

  // Flush immediately if batch is large
  if (pendingBatch.length >= MAX_BATCH_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flushBatch();
  } else {
    schedulFlush();
  }
}

/** Update device heartbeat in the IoT device registry */
async function updateDeviceHeartbeat(deviceId: string) {
  try {
    await prisma.ioTDevice.updateMany({
      where: { deviceId, isActive: true },
      data: { lastHeartbeat: new Date() },
    });
  } catch {
    // Non-critical — heartbeat update failure should not disrupt ingestion
  }
}

// ── Public API ─────────────────────────────────────────────

export async function startMqttIngestion() {
  const brokerUrl = process.env.MQTT_BROKER_URL;

  if (!brokerUrl) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[MQTT] MQTT_BROKER_URL is not set — IoT telemetry will NOT be ingested in production!');
    } else {
      logger.info('[MQTT] No MQTT_BROKER_URL set — skipping MQTT ingestion (dev simulator active)');
    }
    return;
  }

  try {
    const mqtt = await import('mqtt');

    logger.info(`[MQTT] Connecting to broker: ${brokerUrl}`);

    mqttClient = mqtt.connect(brokerUrl, {
      clientId: `coldstorage-backend-${process.env.NODE_ENV}-${Date.now()}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 5_000,
      connectTimeout: 10_000,
      keepalive: 60,
    });

    mqttClient.on('connect', () => {
      mqttConnected = true;
      logger.info('[MQTT] Connected to broker. Subscribing to telemetry topics...');

      mqttClient.subscribe(TOPIC, { qos: 1 }, (err: Error | null) => {
        if (err) {
          logger.error('[MQTT] Subscription failed', { error: String(err) });
        } else {
          logger.info(`[MQTT] Subscribed to: ${TOPIC}`);
        }
      });

      // Also subscribe to heartbeat topics
      mqttClient.subscribe('coldstorage/+/+/heartbeat', { qos: 0 });
    });

    mqttClient.on('message', async (topic: string, payload: Buffer) => {
      if (topic.endsWith('/heartbeat')) {
        const ids = parseTopic(topic.replace('/heartbeat', '/telemetry'));
        if (ids) await updateDeviceHeartbeat(ids.chamberId);
        return;
      }
      await handleMessage(topic, payload);
    });

    mqttClient.on('reconnect', () => {
      mqttConnected = false;
      logger.warn('[MQTT] Disconnected — attempting reconnect...');
    });

    mqttClient.on('error', (err: Error) => {
      logger.error('[MQTT] Client error', { error: err.message });
    });

    mqttClient.on('close', () => {
      mqttConnected = false;
    });

  } catch (err) {
    logger.error('[MQTT] Failed to initialize MQTT client', { error: String(err) });
  }
}

export function stopMqttIngestion() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  // Flush any remaining readings synchronously before shutdown
  if (pendingBatch.length > 0) {
    flushBatch().catch(() => {});
  }

  if (mqttClient) {
    mqttClient.end(true);
    mqttClient = null;
    mqttConnected = false;
    logger.info('[MQTT] Ingestion stopped');
  }
}

/** Returns current MQTT connection status (for health check endpoint) */
export function getMqttStatus() {
  return {
    connected: mqttConnected,
    pendingReadings: pendingBatch.length,
    brokerConfigured: !!process.env.MQTT_BROKER_URL,
  };
}
