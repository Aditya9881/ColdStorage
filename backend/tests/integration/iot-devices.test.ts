/**
 * IoT Devices Module — Integration Tests
 *
 * Tests:
 * - Register a device (owner/staff only)
 * - List devices (scoped by role)
 * - Get device detail
 * - Update device config
 * - Record heartbeat
 * - Deactivate device (soft delete)
 * - Duplicate device ID rejection
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility, createTestChamber,
  TestUser, TestFacility, TestChamber,
} from '../helpers/setup';

const API = '/api/v1/iot-devices';

let owner: TestUser;
let farmer: TestUser;
let facility: TestFacility;
let chamber: TestChamber;

beforeEach(async () => {
  await cleanDatabase();
  owner = await createTestUser('OWNER');
  farmer = await createTestUser('FARMER');
  facility = await createTestFacility(owner.id);
  chamber = await createTestChamber(facility.id);
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// ─────────────────────────────────────────────
// Register Device
// ─────────────────────────────────────────────

describe('POST /iot-devices', () => {
  it('should allow OWNER to register a new IoT device', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        facilityId: facility.id,
        chamberId: chamber.id,
        deviceId: `SENSOR-${Date.now()}`,
        deviceType: 'TEMPERATURE_HUMIDITY',
        description: 'Chamber 1 main sensor',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBeDefined();
    expect(res.body.data.facility).toBeDefined();
    expect(res.body.data.chamber).toBeDefined();
    expect(res.body.data.mqttTopic).toContain('coldstorage/');
  });

  it('should reject registration by FARMER', async () => {
    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        deviceId: 'SENSOR-UNAUTH',
        deviceType: 'TEMPERATURE_HUMIDITY',
      })
      .expect(403);
  });

  it('should reject duplicate device ID', async () => {
    const deviceId = `SENSOR-DUP-${Date.now()}`;

    // First registration
    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ facilityId: facility.id, deviceId, deviceType: 'TEMPERATURE' })
      .expect(201);

    // Duplicate
    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ facilityId: facility.id, deviceId, deviceType: 'TEMPERATURE' })
      .expect(409);
  });

  it('should reject missing required fields', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ facilityId: facility.id })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// List Devices
// ─────────────────────────────────────────────

describe('GET /iot-devices', () => {
  it('should list devices for facility owner', async () => {
    await prisma.ioTDevice.create({
      data: {
        facilityId: facility.id,
        chamberId: chamber.id,
        deviceId: `LIST-DEV-${Date.now()}`,
        deviceType: 'TEMPERATURE',
        mqttTopic: `coldstorage/${facility.id}/${chamber.id}/telemetry`,
      },
    });

    const res = await request(app)
      .get(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.devices.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('should filter by device type', async () => {
    await prisma.ioTDevice.create({
      data: {
        facilityId: facility.id,
        deviceId: `TEMP-DEV-${Date.now()}`,
        deviceType: 'TEMPERATURE',
        mqttTopic: 'test/topic',
      },
    });

    const res = await request(app)
      .get(`${API}?deviceType=TEMPERATURE`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.data.devices.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────
// Device Detail
// ─────────────────────────────────────────────

describe('GET /iot-devices/:id', () => {
  it('should return device details with facility and chamber info', async () => {
    const device = await prisma.ioTDevice.create({
      data: {
        facilityId: facility.id,
        chamberId: chamber.id,
        deviceId: `DETAIL-DEV-${Date.now()}`,
        deviceType: 'TEMPERATURE_HUMIDITY',
        mqttTopic: 'test/detail',
      },
    });

    const res = await request(app)
      .get(`${API}/${device.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(device.id);
    expect(res.body.data.facility).toBeDefined();
    expect(res.body.data.chamber).toBeDefined();
  });

  it('should return 404 for non-existent device', async () => {
    await request(app)
      .get(`${API}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(404);
  });
});

// ─────────────────────────────────────────────
// Update Device
// ─────────────────────────────────────────────

describe('PATCH /iot-devices/:id', () => {
  it('should update device firmware version', async () => {
    const device = await prisma.ioTDevice.create({
      data: {
        facilityId: facility.id,
        deviceId: `UPD-DEV-${Date.now()}`,
        deviceType: 'TEMPERATURE',
        mqttTopic: 'test/update',
      },
    });

    const res = await request(app)
      .patch(`${API}/${device.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ firmwareVersion: '2.1.0', description: 'Updated sensor' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Heartbeat
// ─────────────────────────────────────────────

describe('POST /iot-devices/:id/heartbeat', () => {
  it('should record device heartbeat', async () => {
    const device = await prisma.ioTDevice.create({
      data: {
        facilityId: facility.id,
        deviceId: `HB-DEV-${Date.now()}`,
        deviceType: 'TEMPERATURE',
        mqttTopic: 'test/heartbeat',
      },
    });

    const res = await request(app)
      .post(`${API}/${device.id}/heartbeat`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.lastHeartbeat).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// Deactivate Device
// ─────────────────────────────────────────────

describe('DELETE /iot-devices/:id', () => {
  it('should soft-delete (deactivate) a device', async () => {
    const device = await prisma.ioTDevice.create({
      data: {
        facilityId: facility.id,
        deviceId: `DEL-DEV-${Date.now()}`,
        deviceType: 'TEMPERATURE',
        mqttTopic: 'test/delete',
      },
    });

    const res = await request(app)
      .delete(`${API}/${device.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify device is deactivated, not actually deleted
    const dbDevice = await prisma.ioTDevice.findUnique({ where: { id: device.id } });
    expect(dbDevice).not.toBeNull();
    expect(dbDevice!.isActive).toBe(false);
  });

  it('should reject deactivation by FARMER', async () => {
    const device = await prisma.ioTDevice.create({
      data: {
        facilityId: facility.id,
        deviceId: `NODEL-DEV-${Date.now()}`,
        deviceType: 'TEMPERATURE',
        mqttTopic: 'test/nodelete',
      },
    });

    await request(app)
      .delete(`${API}/${device.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(403);
  });
});
