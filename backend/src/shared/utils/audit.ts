import { prisma } from '../../config/database';
import { UserRole } from '../types';

interface AuditLogParams {
  userId?: string;
  userRole?: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Create an immutable audit log entry.
 * Used for tracking all state changes across the platform.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: (params.oldValues as any) ?? undefined,
        newValues: (params.newValues as any) ?? undefined,
        metadata: (params.metadata as any) ?? undefined,
      },
    });
  } catch (error) {
    // Audit logging should never crash the main flow
    console.error('Failed to create audit log:', error);
  }
}
