import type { PrismaClient } from "@/app/generated/prisma/client";

// ============================================================================
// TRIGRAM HELPERS
// ============================================================================

/**
 * Type pour une transaction Prisma (ou PrismaClient)
 * Exclut les méthodes de connexion/transaction car elles ne sont pas disponibles
 * dans le contexte d'une transaction interactive
 */
type PrismaTransaction = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Configure le seuil de similarité pg_trgm pour une transaction
 *
 * Utilise SET LOCAL pour isoler le changement à la transaction courante,
 * évitant ainsi d'affecter d'autres requêtes avec le connection pooling.
 *
 * SECURITY NOTE:
 * - La valeur est convertie en Number() (pas de string injection)
 * - Math.max(0, Math.min(1, ...)) borne la valeur entre 0 et 1
 * - Number.isFinite() rejette NaN et Infinity
 * - Seul un float valide entre 0.0 et 1.0 peut être interpolé
 *
 * @param tx - Client Prisma ou transaction
 * @param threshold - Seuil de similarité (0.0 - 1.0)
 * @throws Error si le threshold n'est pas un nombre valide
 */
export async function setTrigramThreshold(
	tx: PrismaTransaction,
	threshold: number
): Promise<void> {
	const safeThreshold = Math.max(0, Math.min(1, Number(threshold)));
	if (!Number.isFinite(safeThreshold)) {
		throw new Error("Invalid trigram threshold value");
	}
	await tx.$executeRaw`SET LOCAL pg_trgm.similarity_threshold = ${safeThreshold}::float`;
}
