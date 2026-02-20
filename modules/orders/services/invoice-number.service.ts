import { prisma } from "@/shared/lib/prisma";

/**
 * Generates a sequential invoice number in the format F-YYYY-NNNNN
 *
 * Uses a DB query to find the last invoice number for the current year,
 * then increments by 1. Thread-safe via unique constraint on invoiceNumber.
 *
 * @example "F-2026-00001", "F-2026-00042"
 */
export async function generateInvoiceNumber(): Promise<string> {
	const year = new Date().getFullYear();
	const prefix = `F-${year}-`;

	// Find the highest invoice number for this year
	const lastInvoice = await prisma.order.findFirst({
		where: {
			invoiceNumber: { startsWith: prefix },
		},
		orderBy: { invoiceNumber: "desc" },
		select: { invoiceNumber: true },
	});

	let nextSequence = 1;
	if (lastInvoice?.invoiceNumber) {
		const lastSequence = parseInt(lastInvoice.invoiceNumber.slice(prefix.length), 10);
		if (!isNaN(lastSequence)) {
			nextSequence = lastSequence + 1;
		}
	}

	return `${prefix}${String(nextSequence).padStart(5, "0")}`;
}
