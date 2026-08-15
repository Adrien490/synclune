import type { RetractationStatus } from "@/app/generated/prisma/client";
import { RETRACTATION_REFUND_DEADLINE_DAYS } from "../constants/retractation.constants";

const MS_PER_DAY = 86_400_000;

/**
 * Jours restants avant l'échéance légale de remboursement (14 j après la
 * DEMANDE, art. L221-24). `null` pour une demande close — rien à afficher.
 *
 * Fonction PURE (`now` injecté) : les composants doivent rester purs, le
 * calcul se fait dans la couche data (hors scope "use cache" — un Date.now
 * figé en cache mentirait sur l'échéance).
 */
export function getRefundDeadlineDaysLeft(
	status: RetractationStatus,
	requestedAt: Date,
	now: number,
): number | null {
	if (status === "REFUNDED" || status === "REJECTED") return null;
	const deadline = new Date(requestedAt).getTime() + RETRACTATION_REFUND_DEADLINE_DAYS * MS_PER_DAY;
	return Math.ceil((deadline - now) / MS_PER_DAY);
}
