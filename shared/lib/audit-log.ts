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
