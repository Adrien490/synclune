import { prisma } from "@/shared/lib/prisma";
import type { UserDataExport } from "../types/rgpd.types";

/**
 * Prisma include clause for user data export (RGPD portability)
 */
const USER_DATA_EXPORT_INCLUDE = {
	addresses: {
		orderBy: { createdAt: "desc" as const },
	},
	orders: {
		take: 500,
		include: {
			items: {
				select: {
					productTitle: true,
					skuColor: true,
					skuMaterial: true,
					skuSize: true,
					price: true,
					quantity: true,
				},
			},
		},
		orderBy: { createdAt: "desc" as const },
	},
	wishlist: {
		include: {
			items: {
				include: {
					product: { select: { title: true } },
				},
			},
		},
	},
	discountUsages: {
		take: 200,
		include: {
			discount: { select: { code: true } },
		},
		orderBy: { createdAt: "desc" as const },
	},
	newsletterSubscription: true,
	reviews: {
		take: 200,
		include: {
			product: { select: { title: true } },
		},
		where: { deletedAt: null },
		orderBy: { createdAt: "desc" as const },
	},
	sessions: {
		take: 50,
		orderBy: { createdAt: "desc" as const },
	},
	customizationRequests: {
		take: 500,
		where: { deletedAt: null },
		orderBy: { createdAt: "desc" as const },
		select: {
			firstName: true,
			email: true,
			phone: true,
			productTypeLabel: true,
			details: true,
			status: true,
			createdAt: true,
		},
	},
} as const;

/**
 * Fetch and format all user data for RGPD export (Art. 20 - Droit a la portabilite).
 *
 * Shared between the customer self-service export and admin export actions.
 * Returns null if the user does not exist.
 */
export async function buildUserDataExport(userId: string): Promise<UserDataExport | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: USER_DATA_EXPORT_INCLUDE,
	});

	if (!user) return null;

	return {
		exportedAt: new Date().toISOString(),
		profile: {
			name: user.name,
			email: user.email,
			createdAt: user.createdAt.toISOString(),
			termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
		},
		addresses: user.addresses.map((addr) => ({
			firstName: addr.firstName,
			lastName: addr.lastName,
			address1: addr.address1,
			address2: addr.address2,
			postalCode: addr.postalCode,
			city: addr.city,
			country: addr.country,
			phone: addr.phone,
			isDefault: addr.isDefault,
		})),
		orders: user.orders.map((order) => ({
			orderNumber: order.orderNumber,
			date: order.createdAt.toISOString(),
			status: order.status,
			paymentStatus: order.paymentStatus,
			total: order.total / 100,
			currency: order.currency.toUpperCase(),
			items: order.items.map((item) => ({
				productTitle: item.productTitle,
				skuColor: item.skuColor,
				skuMaterial: item.skuMaterial,
				skuSize: item.skuSize,
				price: item.price / 100,
				quantity: item.quantity,
			})),
			shippingAddress: {
				firstName: order.shippingFirstName,
				lastName: order.shippingLastName,
				address1: order.shippingAddress1,
				city: order.shippingCity,
				postalCode: order.shippingPostalCode,
				country: order.shippingCountry,
			},
		})),
		wishlist:
			user.wishlist?.items
				.filter((item) => item.product !== null)
				.map((item) => ({
					productTitle: item.product!.title,
					addedAt: item.createdAt.toISOString(),
				})) ?? [],
		discountUsages: user.discountUsages.map((usage) => ({
			code: usage.discount.code,
			amountApplied: usage.amountApplied / 100,
			usedAt: usage.createdAt.toISOString(),
		})),
		newsletter: user.newsletterSubscription
			? {
					email: user.newsletterSubscription.email,
					status: user.newsletterSubscription.status,
					subscribedAt: user.newsletterSubscription.subscribedAt.toISOString(),
					confirmedAt: user.newsletterSubscription.confirmedAt?.toISOString() ?? null,
					unsubscribedAt: user.newsletterSubscription.unsubscribedAt?.toISOString() ?? null,
					consentSource: user.newsletterSubscription.consentSource,
					consentTimestamp: user.newsletterSubscription.consentTimestamp.toISOString(),
					ipAddress: user.newsletterSubscription.ipAddress,
				}
			: null,
		reviews: user.reviews.map((review) => ({
			productTitle: review.product?.title ?? null,
			rating: review.rating,
			title: review.title,
			content: review.content,
			createdAt: review.createdAt.toISOString(),
			updatedAt: review.updatedAt.toISOString(),
		})),
		sessions: user.sessions.map((session) => ({
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			createdAt: session.createdAt.toISOString(),
			expiresAt: session.expiresAt.toISOString(),
		})),
		customizationRequests: user.customizationRequests.map((req) => ({
			firstName: req.firstName,
			email: req.email,
			phone: req.phone,
			productTypeLabel: req.productTypeLabel,
			details: req.details,
			status: req.status,
			createdAt: req.createdAt.toISOString(),
		})),
	};
}
