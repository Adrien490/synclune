import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { generateInvoiceNumber } from "./invoice-number.service";
import { getOrderInvalidationTags } from "../constants/cache";

interface PersistInvoiceNumberResult {
	invoiceNumber: string;
	invoiceGeneratedAt: Date;
}

/**
 * Generates and persists an invoice number on first download (Article 286 CGI).
 * Returns the new invoice fields, or null if generation fails.
 */
export async function persistInvoiceNumber(
	orderId: string,
	userId: string | null,
): Promise<PersistInvoiceNumberResult | null> {
	try {
		const invoiceNumber = await generateInvoiceNumber();
		const now = new Date();

		const updated = await prisma.order.update({
			where: { id: orderId },
			data: {
				invoiceNumber,
				invoiceStatus: "GENERATED",
				invoiceGeneratedAt: now,
			},
			select: { invoiceNumber: true, invoiceGeneratedAt: true },
		});

		// Invalidate cache so the invoice number shows in admin
		getOrderInvalidationTags(userId ?? undefined, orderId).forEach((tag) => updateTag(tag));

		return {
			invoiceNumber: updated.invoiceNumber!,
			invoiceGeneratedAt: updated.invoiceGeneratedAt!,
		};
	} catch (e) {
		// If invoice number generation fails (e.g. unique constraint race),
		// caller will still serve the PDF with orderNumber as reference
		console.error("[INVOICE] Failed to persist invoice number:", e);
		return null;
	}
}
