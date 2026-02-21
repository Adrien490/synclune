/**
 * Generates a canonical anonymized email for GDPR account deletion.
 *
 * Uses the full userId for guaranteed uniqueness and .synclune.local
 * domain for traceability in audits.
 */
export function generateAnonymizedEmail(userId: string): string {
	return `anonymized-${userId}@deleted.synclune.local`;
}
