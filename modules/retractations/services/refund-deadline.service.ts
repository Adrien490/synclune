import type { RetractationStatus } from "@/app/generated/prisma/client";
import { RETRACTATION_REFUND_DEADLINE_DAYS } from "../constants/retractation.constants";

const MS_PER_DAY = 86_400_000;

/**
 * Jours restants avant l'échéance légale de remboursement (14 j après la
 * DEMANDE, art. L221-24). `null` pour une demande close — rien à afficher.
 *
 * ⚠️ Conservatisme ASSUMÉ (audit 2026-08-16) : l'art. L221-24 al. 2 permet de
 * différer le remboursement jusqu'à récupération du bien — pour un retour qui
 * traîne, le badge peut donc crier « dépassé » alors que rien n'est encore
 * exigible. C'est la direction sûre : l'alerte n'arrive jamais en retard, et
 * faire courir 14 j depuis `itemReceivedAt` serait, lui, juridiquement faux
 * (après récupération, le remboursement est dû sans délai supplémentaire).
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
