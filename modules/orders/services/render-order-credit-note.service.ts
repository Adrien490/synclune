import { OrderAction } from "@/app/generated/prisma/client";
import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { GET_ORDER_SELECT_CUSTOMER } from "../constants/order.constants";
import type { GetOrderReturn } from "../types/order.types";

const DEFAULT_VOID_REASON = "Avoir comptable";

export interface RenderedOrderCreditNote {
	pdfBuffer: ArrayBuffer;
	creditNoteNumber: string;
}

/**
 * Rend le PDF de l'avoir d'annulation porté par l'Order (full void — Art. 272-I
 * CGI). SSOT du rendu : la route `/api/orders/[orderNumber]/credit-note`,
 * l'archivage eager post-`voidInvoice` et le cron `reconcile-invoices` passent
 * TOUS par cette fonction. Indispensable pour l'immutabilité Art. L102 B LPF :
 * le hash archivé n'est vérifiable que si chaque chemin de régénération produit
 * un PDF bit-identique (même select, même motif, même builder).
 *
 * Retourne null si l'avoir n'existe pas (pas de génération lazy d'avoir — seul
 * `voidInvoice` émet un `creditNoteNumber`, invariant 2).
 */
export async function renderOrderCreditNotePdf(
	orderId: string,
): Promise<RenderedOrderCreditNote | null> {
	const order = (await prisma.order.findFirst({
		where: { id: orderId, ...notDeleted },
		select: GET_ORDER_SELECT_CUSTOMER,
	})) as GetOrderReturn | null;

	if (
		!order ||
		!order.creditNoteNumber ||
		!order.creditNoteGeneratedAt ||
		!order.invoiceNumber ||
		!order.invoiceGeneratedAt
	) {
		return null;
	}

	// Dérive le motif d'avoir depuis le dernier OrderHistory INVOICE_VOIDED
	// (rempli par `voidInvoice` via cancel-order / mark-as-fully-refunded /
	// webhook charge.refunded). Fallback statique conforme juridiquement.
	const voidedEvent = await prisma.orderHistory.findFirst({
		where: { orderId: order.id, action: OrderAction.INVOICE_VOIDED },
		orderBy: { createdAt: "desc" },
		select: { note: true },
	});
	const trimmedNote = voidedEvent?.note?.trim();
	const reason = trimmedNote && trimmedNote.length > 0 ? trimmedNote : DEFAULT_VOID_REASON;

	// `buildInvoiceData` reçoit un Order où `invoiceNumber = creditNoteNumber` :
	// le renderer détecte le préfixe `A-` et bascule en mode AVOIR
	// (render-invoice-pdf.ts:22,69,91,249). `precedingInvoice` injecte la
	// référence vers la facture annulée (Art. 272-I CGI).
	const orderAsCreditNote: GetOrderReturn = {
		...order,
		invoiceNumber: order.creditNoteNumber,
		invoiceGeneratedAt: order.creditNoteGeneratedAt,
	};
	const pdfBuffer = renderInvoicePdf(
		buildInvoiceData(orderAsCreditNote, {
			precedingInvoice: {
				invoiceNumber: order.invoiceNumber,
				issuedAt: order.invoiceGeneratedAt,
				reason,
			},
		}),
	);

	return { pdfBuffer, creditNoteNumber: order.creditNoteNumber };
}
