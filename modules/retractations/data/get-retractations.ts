import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { GET_RETRACTATIONS_SELECT } from "../constants/retractation.constants";
import { getRefundDeadlineDaysLeft } from "../services/refund-deadline.service";
import { RETRACTATIONS_CACHE_TAGS } from "../constants/cache";

export type RetractationListItem = Prisma.RetractationRequestGetPayload<{
	select: typeof GET_RETRACTATIONS_SELECT;
}> & {
	/** Échéance légale de remboursement — calculée ICI, hors cache et hors rendu. */
	refundDeadlineDaysLeft: number | null;
};

/**
 * Liste admin des demandes de rétractation — ADMIN ONLY.
 *
 * Volume attendu : quelques demandes par an (~20 commandes/mois). Pas de
 * pagination ni de filtres : tout, actives d'abord (REFUNDED/REJECTED en
 * queue), plus récentes en tête. Un plafond large borne le pire cas.
 */
export async function getRetractations(): Promise<RetractationListItem[]> {
	if (!(await isAdmin())) return [];

	try {
		const rows = await fetchRetractations();
		// Hors scope "use cache" : un Date.now figé en cache mentirait sur
		// l'échéance ; hors rendu : les composants restent purs.
		const now = Date.now();
		return rows.map((row) => ({
			...row,
			refundDeadlineDaysLeft: getRefundDeadlineDaysLeft(row.status, row.requestedAt, now),
		}));
	} catch (error) {
		if (!isPrerenderInterrupt(error)) {
			logger.error("[getRetractations] Échec de lecture", { error });
		}
		return [];
	}
}

async function fetchRetractations(): Promise<
	Prisma.RetractationRequestGetPayload<{ select: typeof GET_RETRACTATIONS_SELECT }>[]
> {
	"use cache";
	cacheLife("user");
	cacheTag(RETRACTATIONS_CACHE_TAGS.ADMIN_LIST);

	const rows = await prisma.retractationRequest.findMany({
		select: GET_RETRACTATIONS_SELECT,
		orderBy: [{ requestedAt: "desc" }],
		take: 500,
	});

	// Actives (à traiter) d'abord, closes ensuite — l'ordre par date est
	// conservé à l'intérieur de chaque groupe.
	const isClosed = (
		status: "RECEIVED" | "ACKNOWLEDGED" | "AWAITING_RETURN" | "REFUNDED" | "REJECTED",
	) => status === "REFUNDED" || status === "REJECTED";
	return [...rows.filter((r) => !isClosed(r.status)), ...rows.filter((r) => isClosed(r.status))];
}
