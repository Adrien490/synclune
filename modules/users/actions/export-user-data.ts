"use server";

import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

/**
 * Données exportées pour l'utilisateur (droit à la portabilité RGPD - Article 20)
 */
export interface UserDataExport {
	exportedAt: string;
	profile: {
		name: string | null;
		email: string;
		createdAt: string;
	};
	addresses: Array<{
		firstName: string;
		lastName: string;
		address1: string;
		address2: string | null;
		postalCode: string;
		city: string;
		country: string;
		phone: string;
		isDefault: boolean;
	}>;
	orders: Array<{
		orderNumber: string;
		date: string;
		status: string;
		paymentStatus: string;
		total: number;
		currency: string;
		items: Array<{
			productTitle: string;
			skuColor: string | null;
			skuMaterial: string | null;
			skuSize: string | null;
			price: number;
			quantity: number;
		}>;
		shippingAddress: {
			firstName: string;
			lastName: string;
			address1: string;
			city: string;
			postalCode: string;
			country: string;
		};
	}>;
	wishlist: Array<{
		productTitle: string;
		skuColor: string | null;
		price: number;
		addedAt: string;
	}>;
	discountUsages: Array<{
		code: string;
		amountApplied: number;
		usedAt: string;
	}>;
}

/**
 * Server Action pour exporter les données utilisateur (droit à la portabilité RGPD)
 *
 * Exporte toutes les données personnelles de l'utilisateur dans un format structuré (JSON).
 * Conforme à l'article 20 du RGPD - Droit à la portabilité des données.
 */
export async function exportUserData(): Promise<ActionState> {
	try {
		// 1. Vérification de l'authentification
		const currentUser = await getCurrentUser();

		if (!currentUser) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour exporter vos données",
			};
		}

		// 2. Récupérer toutes les données utilisateur
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
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Utilisateur non trouvé",
			};
		}

		// 3. Formater les données pour l'export
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

		return {
			status: ActionStatus.SUCCESS,
			message: "Données exportées avec succès",
			data: exportData,
		};
	} catch (error) {
		console.error("[EXPORT_USER_DATA] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de l'export des données",
		};
	}
}
