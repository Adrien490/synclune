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
 * No-op stub. Audit trail persistence was removed with the AuditLog table.
 * Call sites are preserved to minimise churn across server actions.
 */
export async function logAudit(_params: AuditLogParams): Promise<void> {
	return;
}

/**
 * No-op stub within a transaction context.
 */
export async function logAuditTx(
	_tx: Prisma.TransactionClient,
	_params: AuditLogParams,
): Promise<void> {
	return;
}
