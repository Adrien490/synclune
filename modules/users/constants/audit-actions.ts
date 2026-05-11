/**
 * Identifiants d'actions admin sur utilisateurs pour `logAudit`.
 *
 * Centralisé pour éviter les drifts entre call sites (analytics, parsing).
 */
export const USER_AUDIT_ACTIONS = {
	BULK_PROMOTE: "user.bulkPromote",
	BULK_DEMOTE: "user.bulkDemote",
	CHANGE_ROLE: "user.changeRole",
	DELETE: "user.delete",
	SUSPEND: "user.suspend",
	RESTORE: "user.restore",
	ANONYMIZE_IMMEDIATELY: "user.anonymizeImmediately",
	INVALIDATE_SESSIONS: "user.invalidateSessions",
	SEND_PASSWORD_RESET: "user.sendPasswordReset",
	TOGGLE_EMAIL_VERIFIED: "user.toggleEmailVerified",
	EXPORT_DATA: "user.exportData",
	REFRESH: "user.refresh",
} as const;

export type UserAuditAction = (typeof USER_AUDIT_ACTIONS)[keyof typeof USER_AUDIT_ACTIONS];
