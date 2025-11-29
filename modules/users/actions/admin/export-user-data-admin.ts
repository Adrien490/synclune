"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import type { UserDataExport } from "../export-user-data";

/**
 * Server Action ADMIN pour exporter les données d'un utilisateur (RGPD)
 *
 * Permet à un admin d'exporter toutes les données personnelles d'un utilisateur.
 * Conforme à l'article 20 du RGPD - Droit à la portabilité des données.
 */
export async function exportUserDataAdmin(userId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Récupérer toutes les données utilisateur
		const user = await prisma.user.findUnique({
			where: { id: userId },
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
				user.wishlist?.items.map((item) => ({
					productTitle: item.sku.product.title,
					skuColor: item.sku.color?.name ?? null,
					price: item.priceAtAdd / 100,
					addedAt: item.createdAt.toISOString(),
				})) ?? [],
			discountUsages: user.discountUsages.map((usage) => ({
				code: usage.discount.code,
				amountApplied: usage.amountApplied / 100,
				usedAt: usage.createdAt.toISOString(),
			})),
		};

		return {
			status: ActionStatus.SUCCESS,
			message: "Données exportées avec succès",
			data: exportData,
		};
	} catch (error) {
		console.error("[EXPORT_USER_DATA_ADMIN] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de l'export des données",
		};
	}
}
