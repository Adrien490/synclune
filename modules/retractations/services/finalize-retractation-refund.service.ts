/**
 * Finalisation transactionnelle d'un remboursement de rétractation —
 * service transactionnel (mutation DB assumée hors `actions/`) pour rester
 * atomique et testable.
 *
 * Dans UNE transaction, gardée par le statut source AWAITING_RETURN :
 * - la demande passe REFUNDED (refundedAt + stripeRefundId) ;
 * - le numéro d'avoir est attribué : `max(creditNoteNumber) + 1` sur
 *   RetractationRequest — compteur SÉQUENTIEL DISTINCT du compteur facture
 *   (ne pas les fusionner, ne pas les faire se suivre), même mécanique de
 *   retry borné sur P2002 que `invoiceNumber` ;
 * - la commande passe REFUNDED ;
 * - le restock est OPT-IN (un bijou retourné n'est pas forcément
 *   revendable) — increment par variantId, en ignorant les null (SetNull).
 *
 * Un count = 0 sur la garde (double clic, demande déjà remboursée) rend
 * `noop` : rien n'est écrit, pas de numéro consommé.
 */
import { Prisma } from "@/app/generated/prisma/client";
import { PRODUCTS_CACHE_TAGS } from "@/modules/products/constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { getRetractationInvalidationTags } from "../constants/cache";

const CREDIT_NOTE_MAX_ATTEMPTS = 3;

function isUniqueConstraintError(error: unknown): boolean {
	return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export interface FinalizeRefundResult {
	outcome: "refunded" | "noop";
	orderId: string | null;
	creditNoteNumber: number | null;
	/** Tags à invalider par l'appelant (Server Action ⇒ updateTagsAfterMutation). */
	tags: string[];
}

export async function finalizeRetractationRefund(params: {
	retractationId: string;
	stripeRefundId: string;
	restock: boolean;
}): Promise<FinalizeRefundResult> {
	const { retractationId, stripeRefundId, restock } = params;

	for (let attempt = 1; attempt <= CREDIT_NOTE_MAX_ATTEMPTS; attempt++) {
		try {
			return await prisma.$transaction(async (tx) => {
				const { count } = await tx.retractationRequest.updateMany({
					where: { id: retractationId, status: "AWAITING_RETURN" },
					data: { status: "REFUNDED", refundedAt: new Date(), stripeRefundId },
				});
				if (count === 0) {
					return { outcome: "noop" as const, orderId: null, creditNoteNumber: null, tags: [] };
				}

				const aggregate = await tx.retractationRequest.aggregate({
					_max: { creditNoteNumber: true },
				});
				const creditNoteNumber = (aggregate._max.creditNoteNumber ?? 0) + 1;
				await tx.retractationRequest.update({
					where: { id: retractationId },
					data: { creditNoteNumber },
				});

				const retractation = await tx.retractationRequest.findUnique({
					where: { id: retractationId },
					select: {
						orderId: true,
						order: { select: { items: { select: { variantId: true, quantity: true } } } },
					},
				});
				if (!retractation) {
					throw new Error("Demande introuvable après transition — état incohérent");
				}

				await tx.order.updateMany({
					where: { id: retractation.orderId, status: { in: ["PAID", "SHIPPED"] } },
					data: { status: "REFUNDED" },
				});

				const tags = new Set<string>(
					getRetractationInvalidationTags({ retractationId, orderId: retractation.orderId }),
				);

				if (restock) {
					tags.add(SHARED_CACHE_TAGS.ADMIN_INVENTORY_LIST);
					tags.add(PRODUCTS_CACHE_TAGS.LIST);
					tags.add(PRODUCTS_CACHE_TAGS.VARIANTS_LIST);
					for (const item of retractation.order.items) {
						if (!item.variantId) continue;
						await tx.productVariant.updateMany({
							where: { id: item.variantId },
							data: { stock: { increment: item.quantity } },
						});
						tags.add(PRODUCTS_CACHE_TAGS.VARIANT_STOCK(item.variantId));
						tags.add(PRODUCTS_CACHE_TAGS.VARIANT_DETAIL_BY_ID(item.variantId));
					}
				}

				return {
					outcome: "refunded" as const,
					orderId: retractation.orderId,
					creditNoteNumber,
					tags: Array.from(tags),
				};
			});
		} catch (error) {
			if (isUniqueConstraintError(error) && attempt < CREDIT_NOTE_MAX_ATTEMPTS) {
				logger.warn("[finalizeRetractationRefund] Collision creditNoteNumber (P2002) — retry", {
					retractationId,
					attempt,
				});
				continue;
			}
			throw error;
		}
	}
	throw new Error("finalizeRetractationRefund: tentatives épuisées");
}
