import { EReportingStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

export type EReportingBatchDetail = NonNullable<
	Awaited<ReturnType<typeof fetchEReportingBatchById>>
>;

/**
 * Détail complet d'un batch e-reporting pour la page admin
 * `/admin/ventes/facturation/batches/[id]`.
 *
 * Non caché — l'admin a besoin de la version la plus à jour (statut transmission,
 * réponse provider) après chaque retry. EINV-UI-011 audit 2026-05-28.
 */
export async function getEReportingBatchById(id: string): Promise<EReportingBatchDetail | null> {
	if (!(await isAdmin())) return null;
	return fetchEReportingBatchById(id);
}

async function fetchEReportingBatchById(id: string) {
	const batch = await prisma.eReportingBatch.findUnique({
		where: { id },
		select: {
			id: true,
			status: true,
			periodFrom: true,
			periodTo: true,
			transactionCount: true,
			totalAmountIncTax: true,
			totalAmountExclTax: true,
			totalTaxAmount: true,
			currency: true,
			providerBatchId: true,
			providerResponse: true,
			sentAt: true,
			acceptedAt: true,
			rejectedAt: true,
			rejectionReason: true,
			retryCount: true,
			createdAt: true,
			updatedAt: true,
			transactions: {
				select: {
					id: true,
					type: true,
					occurredAt: true,
					amountIncTax: true,
					orderId: true,
					order: {
						select: {
							orderNumber: true,
							invoiceNumber: true,
						},
					},
				},
				orderBy: { occurredAt: "asc" },
				take: 50,
			},
		},
	});
	return batch;
}

/** Statuts éligibles à un retry manuel (EINV-UI-011). */
export const RETRYABLE_BATCH_STATUSES: ReadonlySet<EReportingStatus> = new Set([
	EReportingStatus.REJECTED,
	EReportingStatus.ABANDONED,
]);
