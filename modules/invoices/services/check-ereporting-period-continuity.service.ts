import { EReportingStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import {
	computeEReportingPeriod,
	EREPORTING_ORPHAN_GRACE_MS,
} from "@/modules/invoices/constants/ereporting-period";

/**
 * EINV-EREPORT-008 — Contrôle de continuité anti-trou des périodes e-reporting B2C.
 *
 * DÉFENSE EN PROFONDEUR — lecture seule. La contrainte d'exclusion
 * `EReportingPeriod_no_overlap` garantit le NON-RECOUVREMENT des périodes, mais
 * PAS l'absence de TROU : un EXCLUDE est parfaitement satisfait si l'on saute une
 * période contiguë. Or une transaction dont la période n'est jamais matérialisée
 * (= jamais batchée) est une SOUS-DÉCLARATION DGFiP.
 *
 * Plutôt qu'un contrôle structurel sur les lignes `EReportingPeriod` (qui ferait
 * de faux positifs sur les périodes sans vente — légitimement absentes), on
 * détecte le signal DIRECT : les `EReportingTransaction` PENDING + `batchId` NULL
 * dont la période est close depuis plus que le délai de grâce. Zéro vente sur une
 * période ⇒ zéro transaction ⇒ zéro orphelin : aucun faux positif. Ce contrôle ne
 * dépend pas de « le cron build tourne toujours » — il attrape précisément le cas
 * où `build-ereporting-batch` n'a pas tourné / a sauté une période. Câblé dans le
 * cron `reconcile-invoices` (Passe 5).
 *
 * ⚠️ PORTÉE : ce contrôle ne voit QUE les transactions **créées-mais-non-batchées**.
 * Une transaction **jamais créée** (recordSalesEReporting/recordRefundEReporting a
 * échoué sur le hot path → aucune ligne `EReportingTransaction`) est invisible ici
 * et NE constitue PAS un orphelin. Ce cas — sous-déclaration encore plus grave car
 * silencieuse — est couvert par un mécanisme distinct : le DLQ EINV-EREPORT-009
 * (flags `Order.ereportingRetryDeferred` / `Refund.ereportingRetryDeferred` +
 * Passes SALES/REFUND de `reconcile-invoices`). La continuité de période suppose
 * donc que toute vente/remboursement PAID a bien produit sa transaction — ce
 * prérequis est garanti par EINV-EREPORT-009, pas par ce contrôle.
 *
 * Symétrie volontaire avec `check-sequence-continuity.service.ts` (R6, Art. 286).
 */

const SAMPLE_CAP = 50;

export interface EReportingOrphanReport {
	/** Nombre de transactions orphelines (PENDING, sans batch, période close > grâce). */
	orphanCount: number;
	/** `occurredAt` de la plus ancienne orpheline (ISO 8601). */
	oldestOccurredAt: string;
	/** Fin de période (exclusive) de la plus ancienne orpheline (ISO 8601). */
	oldestPeriodTo: string;
	/** Échantillon d'ids (cap 50) pour l'investigation admin. */
	sampleIds: string[];
}

/**
 * Détecte les transactions e-reporting orphelines à l'instant `now`.
 * @returns un rapport, ou `null` si aucune orpheline (cas nominal).
 */
export async function checkEReportingOrphanTransactions(
	now: Date,
): Promise<EReportingOrphanReport | null> {
	// On tire toutes les PENDING non rattachées (volume attendu faible : le cron
	// build les vide quotidiennement) puis on filtre par clôture de période en
	// mémoire — la borne dépend de EREPORTING_PERIOD_LENGTH, non exprimable en SQL.
	const pending = await prisma.eReportingTransaction.findMany({
		where: { status: EReportingStatus.PENDING, batchId: null },
		select: { id: true, occurredAt: true },
		orderBy: { occurredAt: "asc" },
	});

	const nowMs = now.getTime();
	const orphans = pending.filter((tx) => {
		const { periodTo } = computeEReportingPeriod(tx.occurredAt);
		return periodTo.getTime() + EREPORTING_ORPHAN_GRACE_MS < nowMs;
	});

	if (orphans.length === 0) return null;

	// `orphans` hérite du tri croissant par occurredAt → le premier est le plus ancien.
	const oldest = orphans[0]!;
	const { periodTo: oldestPeriodTo } = computeEReportingPeriod(oldest.occurredAt);

	return {
		orphanCount: orphans.length,
		oldestOccurredAt: oldest.occurredAt.toISOString(),
		oldestPeriodTo: oldestPeriodTo.toISOString(),
		sampleIds: orphans.slice(0, SAMPLE_CAP).map((t) => t.id),
	};
}
