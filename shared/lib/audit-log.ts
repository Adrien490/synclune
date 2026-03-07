import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import type { Prisma } from "@/app/generated/prisma/client";

interface AuditLogParams {
	adminId: string;
	adminName: string;
	action: string;
	targetType: string;
	targetId: string;
	metadata?: Record<string, unknown>;
}

/**
 * Log an admin mutation to the audit trail.
 *
 * Fire-and-forget: errors are logged but never block the caller.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
	try {
		await prisma.auditLog.create({
			data: {
				adminId: params.adminId,
				adminName: params.adminName,
				action: params.action,
				targetType: params.targetType,
				targetId: params.targetId,
				metadata: params.metadata as Prisma.InputJsonValue,
			},
		});
	} catch (error) {
		logger.error("Failed to write audit log", error, { service: "audit" });
	}
}

/**
 * Log an admin mutation within an existing Prisma transaction.
 */
export async function logAuditTx(
	tx: Prisma.TransactionClient,
	params: AuditLogParams,
): Promise<void> {
	await tx.auditLog.create({
		data: {
			adminId: params.adminId,
			adminName: params.adminName,
			action: params.action,
			targetType: params.targetType,
			targetId: params.targetId,
			metadata: params.metadata as Prisma.InputJsonValue,
		},
	});
}
