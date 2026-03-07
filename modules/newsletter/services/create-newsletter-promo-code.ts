import { DiscountType, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { randomBytes } from "crypto";

/**
 * Creates a unique -10% promo code for a new newsletter subscriber.
 * Code format: BIENVENUE-XXXXXX (6 random alphanumeric chars).
 * Valid for 30 days, single use per user.
 * Retries once on unique constraint collision (P2002).
 */
export async function createNewsletterPromoCode(): Promise<string> {
	return createCodeWithRetry();
}

async function createCodeWithRetry(attempt = 0): Promise<string> {
	const suffix = randomBytes(3).toString("hex").toUpperCase();
	const code = `BIENVENUE-${suffix}`;

	const thirtyDaysFromNow = new Date();
	thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

	try {
		await prisma.discount.create({
			data: {
				code,
				type: DiscountType.PERCENTAGE,
				value: 10,
				maxUsageCount: 1,
				maxUsagePerUser: 1,
				startsAt: new Date(),
				endsAt: thirtyDaysFromNow,
				isActive: true,
			},
		});

		return code;
	} catch (e) {
		// Retry once on unique constraint collision (1/16.7M probability)
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt === 0) {
			return createCodeWithRetry(1);
		}
		throw e;
	}
}
