// apps/backend/src/utils/audit.util.ts

import type { Request } from 'express';
import { prisma } from '../config/database.js';

interface AuditAction {
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an admin action to the audit trail.
 * Fire-and-forget — never throws. Audit failure does not block admin actions.
 */
export function logAdminAction(req: Request, auditAction: AuditAction): void {
  const adminId = req.user?.id;
  if (!adminId) return;

  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    null;

  prisma.adminAuditLog
    .create({
      data: {
        adminId,
        action: auditAction.action,
        targetType: auditAction.targetType,
        targetId: auditAction.targetId ?? null,
        details: auditAction.details ?? undefined,
        ipAddress,
      },
    })
    .catch((error) => {
      console.error('Audit log write failed:', error);
    });
}
