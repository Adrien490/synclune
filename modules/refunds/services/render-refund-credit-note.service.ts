import { RefundStatus, type Prisma } from "@/app/generated/prisma/client";
import { buildCreditNoteData } from "@/modules/invoices/services/build-credit-note-data";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { GET_ORDER_SELECT_CUSTOMER } from "@/modules/orders/constants/order.constants";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { prisma, notDeleted } from "@/shared/lib/prisma";

/**
 * Select de l'avoir validé contre le client Prisma généré.
 *
 * EINV-CREDIT-018 : `satisfies Prisma.RefundSelect` force `tsc` à rejeter à la
 * COMPILATION tout champ inexistant. Régression historique : le `select`
 * demandait `orderItem.{ taxRate, taxCategoryCode, hsCode, unitCode }`, colonnes
 * absentes du modèle `OrderItem` (la TVA par ligne n'est pas stockée en franchise
 * art. 293 B — elle se dérive intégralement, cf. `buildInvoiceLine`). Prisma
 * validant le `select` contre le client généré, l'appel levait une
 * `PrismaClientValidationError` au runtime → 500 sur TOUT téléchargement d'avoir,
 * masqué par les mocks de test. On dérive désormais ces valeurs à 0/DEFAULT/null
 * dans `buildCreditNoteLine`, exactement comme le chemin facture.
 */
export const CREDIT_NOTE_REFUND_SELECT = {
	id: true,
	amount: true,
	reason: true,
	status: true,
	creditNoteNumber: true,
	creditNoteGeneratedAt: true,
	creditNotePdfUrl: true,
	creditNotePdfHash: true,
	items: {
		select: {
			orderItemId: true,
			quantity: true,
			amount: true,
			orderItem: {
				select: {
					productTitle: true,
					productDescription: true,
					skuSku: true,
					skuColor: true,
					skuMaterial: true,
					skuSize: true,
					quantity: true,
					price: true,
				},
			},
		},
	},
} as const satisfies Prisma.RefundSelect;

export interface RenderedRefundCreditNote {
	pdfBuffer: ArrayBuffer;
	creditNoteNumber: string;
	orderId: string;
}

/**
 * Rend le PDF de l'avoir partiel rattaché à un Refund (Art. 272-I CGI). SSOT du
 * rendu : la route `/api/orders/[orderNumber]/credit-note/[refundId]`,
 * l'archivage eager post-`issueCreditNoteForRefund` et le cron
 * `reconcile-invoices` passent TOUS par cette fonction — un PDF régénéré doit
 * rester bit-identique au hash archivé (Art. L102 B LPF).
 *
 * Retourne null si l'avoir n'existe pas ou si le refund n'est pas COMPLETED
 * (l'avoir n'est émis que par `issueCreditNoteForRefund`, invariant 2).
 */
export async function renderRefundCreditNotePdf(
	refundId: string,
): Promise<RenderedRefundCreditNote | null> {
	const refund = await prisma.refund.findFirst({
		where: { id: refundId, deletedAt: null },
		select: { ...CREDIT_NOTE_REFUND_SELECT, orderId: true },
	});

	if (
		!refund ||
		refund.status !== RefundStatus.COMPLETED ||
		!refund.creditNoteNumber ||
		!refund.creditNoteGeneratedAt
	) {
		return null;
	}

	const order = (await prisma.order.findFirst({
		where: { id: refund.orderId, ...notDeleted },
		select: GET_ORDER_SELECT_CUSTOMER,
	})) as GetOrderReturn | null;
	if (!order) {
		return null;
	}

	const creditNoteData = buildCreditNoteData(order, {
		id: refund.id,
		amount: refund.amount,
		reason: refund.reason,
		creditNoteNumber: refund.creditNoteNumber,
		creditNoteGeneratedAt: refund.creditNoteGeneratedAt,
		items: refund.items,
	});
	const pdfBuffer = renderInvoicePdf(creditNoteData);

	return { pdfBuffer, creditNoteNumber: refund.creditNoteNumber, orderId: refund.orderId };
}
