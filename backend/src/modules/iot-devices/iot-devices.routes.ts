import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { createAuditLog } from '../../shared/utils/audit';

const router = Router();
router.use(authenticate);

// ── POST /iot-devices — Register a new IoT device ──
router.post('/', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { facilityId, chamberId, deviceId, deviceType, mqttTopic, firmwareVersion, description } = req.body;

  if (!facilityId || !deviceId || !deviceType) {
    errors.badRequest(res, 'facilityId, deviceId, and deviceType are required');
    return;
  }

  // Verify facility exists and user has access
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) { errors.notFound(res, 'Facility not found'); return; }

  if (req.user!.role === UserRole.OWNER && facility.ownerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only register devices for your own facilities');
    return;
  }
  if (req.user!.role === UserRole.STAFF && req.user!.facilityId !== facilityId) {
    errors.forbidden(res, 'You can only register devices for your assigned facility');
    return;
  }

  // Verify chamber belongs to facility (if provided)
  if (chamberId) {
    const chamber = await prisma.chamber.findFirst({ where: { id: chamberId, facilityId } });
    if (!chamber) { errors.notFound(res, 'Chamber not found in this facility'); return; }
  }

  // Check unique deviceId
  const existing = await prisma.ioTDevice.findUnique({ where: { deviceId } });
  if (existing) { errors.conflict(res, 'A device with this ID is already registered'); return; }

  // Auto-generate MQTT topic if not provided
  const topic = mqttTopic || `coldstorage/${facilityId}/${chamberId || 'unassigned'}/telemetry`;

  const device = await prisma.ioTDevice.create({
    data: {
      facilityId,
      chamberId: chamberId || null,
      deviceId,
      deviceType,
      mqttTopic: topic,
      firmwareVersion: firmwareVersion || null,
      description: description || null,
    },
    include: {
      facility: { select: { id: true, name: true } },
      chamber: { select: { id: true, chamberNumber: true, name: true } },
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'IOT_DEVICE_REGISTERED',
    entityType: 'IoTDevice',
    entityId: device.id,
    newValues: { deviceId, deviceType, facilityId, chamberId },
  });

  sendSuccess(res, device, 201);
}));

// ── GET /iot-devices — List devices (filterable by facility/chamber/status) ──
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { facilityId, chamberId, active, deviceType, page = '1', limit = '20' } = req.query;

  const where: any = {};

  // Scope to user's facility for OWNER/STAFF
  if (req.user!.role === UserRole.OWNER) {
    const ownedFacilities = await prisma.facility.findMany({
      where: { ownerId: req.user!.userId },
      select: { id: true },
    });
    where.facilityId = { in: ownedFacilities.map(f => f.id) };
  } else if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    where.facilityId = req.user!.facilityId;
  }

  // Additional filters
  if (facilityId) where.facilityId = facilityId as string;
  if (chamberId) where.chamberId = chamberId as string;
  if (active !== undefined) where.isActive = active === 'true';
  if (deviceType) where.deviceType = deviceType as string;

  const pageNum = Math.max(1, parseInt(page as string));
  const pageSize = Math.min(50, parseInt(limit as string));

  const [devices, total] = await Promise.all([
    prisma.ioTDevice.findMany({
      where,
      include: {
        facility: { select: { id: true, name: true } },
        chamber: { select: { id: true, chamberNumber: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ioTDevice.count({ where }),
  ]);

  sendSuccess(res, {
    devices,
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}));

// ── GET /iot-devices/:id — Device details ──
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const device = await prisma.ioTDevice.findUnique({
    where: { id: paramString(req.params.id) },
    include: {
      facility: { select: { id: true, name: true, ownerId: true } },
      chamber: {
        select: {
          id: true, chamberNumber: true, name: true,
          targetTempMin: true, targetTempMax: true,
          targetHumidityMin: true, targetHumidityMax: true,
        },
      },
    },
  });

  if (!device) { errors.notFound(res, 'IoT device not found'); return; }

  sendSuccess(res, device);
}));

// ── PATCH /iot-devices/:id — Update device config ──
router.patch('/:id', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const { chamberId, mqttTopic, firmwareVersion, description, isActive } = req.body;

  const existing = await prisma.ioTDevice.findUnique({
    where: { id },
    include: { facility: { select: { ownerId: true } } },
  });
  if (!existing) { errors.notFound(res, 'IoT device not found'); return; }

  // Authorization check
  if (req.user!.role === UserRole.OWNER && existing.facility.ownerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only update devices for your own facilities');
    return;
  }

  // Verify new chamber belongs to same facility
  if (chamberId) {
    const chamber = await prisma.chamber.findFirst({ where: { id: chamberId, facilityId: existing.facilityId } });
    if (!chamber) { errors.notFound(res, 'Chamber not found in this facility'); return; }
  }

  const updated = await prisma.ioTDevice.update({
    where: { id },
    data: {
      ...(chamberId !== undefined && { chamberId }),
      ...(mqttTopic !== undefined && { mqttTopic }),
      ...(firmwareVersion !== undefined && { firmwareVersion }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      facility: { select: { id: true, name: true } },
      chamber: { select: { id: true, chamberNumber: true, name: true } },
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: isActive === false ? 'IOT_DEVICE_DEACTIVATED' : 'IOT_DEVICE_UPDATED',
    entityType: 'IoTDevice',
    entityId: id,
    oldValues: { chamberId: existing.chamberId, isActive: existing.isActive },
    newValues: { chamberId: updated.chamberId, isActive: updated.isActive },
  });

  sendSuccess(res, updated);
}));

// ── POST /iot-devices/:id/heartbeat — Record device heartbeat ──
router.post('/:id/heartbeat', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const device = await prisma.ioTDevice.findUnique({ where: { id } });
  if (!device) { errors.notFound(res, 'IoT device not found'); return; }

  const updated = await prisma.ioTDevice.update({
    where: { id },
    data: { lastHeartbeat: new Date() },
  });

  sendSuccess(res, { id: updated.id, lastHeartbeat: updated.lastHeartbeat });
}));

// ── DELETE /iot-devices/:id — Deactivate device (soft delete) ──
router.delete('/:id', authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const device = await prisma.ioTDevice.findUnique({
    where: { id },
    include: { facility: { select: { ownerId: true } } },
  });
  if (!device) { errors.notFound(res, 'IoT device not found'); return; }

  if (req.user!.role === UserRole.OWNER && device.facility.ownerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only deactivate devices for your own facilities');
    return;
  }

  await prisma.ioTDevice.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'IOT_DEVICE_DEACTIVATED',
    entityType: 'IoTDevice',
    entityId: id,
  });

  sendSuccess(res, { message: 'Device deactivated successfully' });
}));

export default router;
