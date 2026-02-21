import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

const MAX_RETRIES = 5;

/**
 * Generates a sequential invoice number in the format F-YYYY-NNNNN
 *
 * Uses a transaction with raw SQL locking to prevent race conditions.
 * On unique constraint violation, retries up to MAX_RETRIES times.
 *
 * @example "F-2026-00001", "F-2026-00042"
 */
export async function generateInvoiceNumber(): Promise<string> {
	const year = new Date().getFullYear();
	const prefix = `F-${year}-`;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			return await prisma.$transaction(async (tx) => {
				// Use raw SQL with FOR UPDATE to lock the row and prevent concurrent reads
				const result = await tx.$queryRaw<
					Array<{ invoiceNumber: string | null }>
				>(
					Prisma.sql`SELECT "invoiceNumber" FROM "Order"
						WHERE "invoiceNumber" LIKE ${prefix + "%"}
						ORDER BY "invoiceNumber" DESC
						LIMIT 1
						FOR UPDATE`
				);

				let nextSequence = 1;
				const lastInvoiceNumber = result[0]?.invoiceNumber;
				if (lastInvoiceNumber) {
					const lastSequence = parseInt(
						lastInvoiceNumber.slice(prefix.length),
						10
					);
					if (!isNaN(lastSequence)) {
						nextSequence = lastSequence + 1;
					}
				}

				return `${prefix}${String(nextSequence).padStart(5, "0")}`;
			});
		} catch (e) {
			// Retry on unique constraint violation (P2002) - another request got the same number
			if (
				e instanceof Prisma.PrismaClientKnownRequestError &&
				e.code === "P2002" &&
				attempt < MAX_RETRIES - 1
			) {
				continue;
			}
			throw e;
		}
	}

	throw new Error("Failed to generate invoice number after maximum retries");
}
