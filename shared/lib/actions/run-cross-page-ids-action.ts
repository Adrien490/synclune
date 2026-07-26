"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { error, handleActionError, success } from "@/shared/lib/actions";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";
import type { ActionState } from "@/shared/types/server-action";

interface RunCrossPageIdsOptions<TWhere> {
	/** Configuration de rate-limiting par module (admin-{entity}-refresh). */
	rateLimitConfig: RateLimitConfig;
	/** Cap de sélection (cf. `BULK_*_ACTION_LIMIT`). */
	cap: number;
	/**
	 * Construit la clause `where` Prisma. Appelée **après** auth + rate-limit
	 * (pas avant — évite de payer le coût si l'admin n'est pas autorisé ou
	 * rate-limité). Async-friendly pour les cas comme products (full-text
	 * search async via embeddings).
	 */
	buildWhere: () => Promise<TWhere> | TWhere;
	/** Récupère les ids matching `where`. Doit appliquer un `take: cap`. */
	fetchIds: (where: TWhere) => Promise<Array<{ id: string }>>;
	/** Compte total exact (sans cap) pour afficher « N filtrés (max X) ». */
	fetchCount: (where: TWhere) => Promise<number>;
	/** Message FR quand aucun item ne matche (ex: « Aucune couleur ne correspond… »). */
	emptyMessage: string;
	/** Message FR de repli si exception (ex: « Impossible de charger les couleurs filtrées »). */
	errorFallback: string;
}

/**
 * Helper factorisant le boilerplate auth + rate-limit + response building
 * commun aux 9 actions `getFiltered{Entity}Ids` de l'admin.
 *
 * Chaque module conserve sa propre query Prisma + `buildWhereClause` + cap +
 * rate-limit config (configurés par appel), mais le wrapping auth/erreur est
 * centralisé. Permet de garantir la cohérence du shape de réponse
 * (`FilteredIdsData`) à travers les modules sans factoriser le typing Prisma
 * (qui resterait complexe et fragile vu les variantes per-model).
 *
 * @example
 * ```ts
 * export async function getFilteredColorIds(params) {
 *   return runCrossPageIdsAction({
 *     rateLimitConfig: ADMIN_COLOR_LIMITS.REFRESH,
 *     cap: BULK_COLOR_ACTION_LIMIT,
 *     emptyMessage: "Aucune couleur ne correspond aux filtres actuels",
 *     errorFallback: "Impossible de charger les couleurs filtrées",
 *     fetchIds: () => prisma.color.findMany({ where, select: { id: true }, take: cap }),
 *     fetchCount: () => prisma.color.count({ where }),
 *   });
 * }
 * ```
 */
export async function runCrossPageIdsAction<TWhere>(
	opts: RunCrossPageIdsOptions<TWhere>,
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const rateLimit = await enforceRateLimitForCurrentUser(opts.rateLimitConfig);
		if ("error" in rateLimit) return rateLimit.error;

		const where = await opts.buildWhere();

		const [rows, totalCount] = await Promise.all([opts.fetchIds(where), opts.fetchCount(where)]);

		if (rows.length === 0) {
			return error(opts.emptyMessage);
		}

		return success("Sélection cross-page récupérée", {
			ids: rows.map((r) => r.id),
			totalCount,
			cappedAt: opts.cap,
		});
	} catch (e) {
		return handleActionError(e, opts.errorFallback);
	}
}
