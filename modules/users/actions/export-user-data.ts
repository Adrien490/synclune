"use server";

import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	requireAuth,
	enforceRateLimitForCurrentUser,
	success,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import type { UserDataExport } from "../types/rgpd.types";

// Re-export pour retrocompatibilite
export type { UserDataExport } from "../types/rgpd.types";

// Rate limit: 5 requêtes par heure (action intensive)
const EXPORT_DATA_RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

/**
 * Server Action pour exporter les données utilisateur (droit à la portabilité RGPD)
 *
 * Exporte toutes les données personnelles de l'utilisateur dans un format structuré (JSON).
 * Conforme à l'article 20 du RGPD - Droit à la portabilité des données.
 */
export async function exportUserData(): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(EXPORT_DATA_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification de l'authentification
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		const currentUser = userAuth.user;

		// 3. Récupérer toutes les données utilisateur
		const user = await prisma.user.findUnique({
			where: { id: currentUser.id },
			include: {
				addresses: {
					orderBy: { createdAt: "desc" },
				},
				orders: {
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
					orderBy: { createdAt: "desc" },
				},
				wishlist: {
					include: {
						items: {
							include: {
								sku: {
									include: {
										product: { select: { title: true } },
										color: { select: { name: true } },
									},
								},
							},
						},
					},
				},
				discountUsages: {
					include: {
						discount: { select: { code: true } },
					},
					orderBy: { createdAt: "desc" },
				},
			},
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		// 4. Formater les données pour l'export
		const exportData: UserDataExport = {
			exportedAt: new Date().toISOString(),
			profile: {
				name: user.name,
				email: user.email,
				createdAt: user.createdAt.toISOString(),
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
				total: order.total / 100, // Convertir centimes en euros
				currency: order.currency.toUpperCase(),
				items: order.items.map((item) => ({
					productTitle: item.productTitle,
					skuColor: item.skuColor,
					skuMaterial: item.skuMaterial,
					skuSize: item.skuSize,
					price: item.price / 100, // Convertir centimes en euros
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
				user.wishlist?.items.map((item) => ({
					productTitle: item.sku.product.title,
					skuColor: item.sku.color?.name ?? null,
					price: item.priceAtAdd / 100, // Convertir centimes en euros
					addedAt: item.createdAt.toISOString(),
				})) ?? [],
			discountUsages: user.discountUsages.map((usage) => ({
				code: usage.discount.code,
				amountApplied: usage.amountApplied / 100, // Convertir centimes en euros
				usedAt: usage.createdAt.toISOString(),
			})),
		};

		return success("Données exportées avec succès", exportData);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'export des données");
	}
}
