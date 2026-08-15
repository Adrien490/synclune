import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { GET_RETRACTATION_SELECT } from "../constants/retractation.constants";
import { getRefundDeadlineDaysLeft } from "../services/refund-deadline.service";
import { RETRACTATIONS_CACHE_TAGS } from "../constants/cache";

export type RetractationDetail = Prisma.RetractationRequestGetPayload<{
	select: typeof GET_RETRACTATION_SELECT;
}> & {
	/** Échéance légale de remboursement — calculée ICI, hors cache et hors rendu. */
	refundDeadlineDaysLeft: number | null;
};

/** Détail admin d'une demande — ADMIN ONLY. */
export async function getRetractationById(
	retractationId: string,
): Promise<RetractationDetail | null> {
	if (!retractationId || !(await isAdmin())) return null;

	try {
		const row = await fetchRetractationById(retractationId);
		if (!row) return null;
		return {
			...row,
			refundDeadlineDaysLeft: getRefundDeadlineDaysLeft(row.status, row.requestedAt, Date.now()),
		};
	} catch (error) {
		if (!isPrerenderInterrupt(error)) {
			logger.error("[getRetractationById] Échec de lecture", { retractationId, error });
		}
		return null;
	}
}

async function fetchRetractationById(
	retractationId: string,
): Promise<Prisma.RetractationRequestGetPayload<{
	select: typeof GET_RETRACTATION_SELECT;
}> | null> {
	"use cache";
	cacheLife("user");
	cacheTag(RETRACTATIONS_CACHE_TAGS.DETAIL(retractationId), RETRACTATIONS_CACHE_TAGS.ADMIN_LIST);

	return prisma.retractationRequest.findUnique({
		where: { id: retractationId },
		select: GET_RETRACTATION_SELECT,
	});
}
