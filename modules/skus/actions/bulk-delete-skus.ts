"use server";

import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_BULK_OPERATIONS_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { handleActionError, safeFormGet, validateInput } from "@/shared/lib/actions";
import { deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { bulkDeleteSkusSchema } from "../schemas/sku.schemas";
import { CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { collectBulkInvalidationTags, invalidateTags } from "../utils/cache.utils";
import { BULK_SKU_LIMITS } from "../constants/sku.constants";

export async function bulkDeleteSkus(
	prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_BULK_OPERATIONS_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			ids: safeFormGet(formData, "ids"),
		};

		const validation = validateInput(bulkDeleteSkusSchema, rawData);
		if ("error" in validation) return validation.error;
		const { ids } = validation.data;

		if (ids.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune variante sélectionnée",
			};
		}

		if (ids.length > BULK_SKU_LIMITS.DEFAULT) {
			return {
				status: ActionStatus.ERROR,
				message: `Maximum ${BULK_SKU_LIMITS.DEFAULT} variantes par operation`,
			};
		}

		// Récupérer les infos des SKUs pour validation, suppression fichiers et invalidation du cache
		const skusData = await prisma.productSku.findMany({
			where: { id: { in: ids } },
			select: {
				id: true,
				sku: true,
				productId: true,
				isDefault: true,
				isActive: true,
				product: {
					select: {
						slug: true,
						status: true,
						_count: { select: { skus: true } },
						skus: {
							where: { isActive: true },
							select: { id: true },
						},
					},
				},
				images: { select: { url: true } },
			},
		});

		if (skusData.length !== ids.length) {
			const missing = ids.length - skusData.length;
			return {
				status: ActionStatus.ERROR,
				message: `${missing} variante(s) introuvable(s) sur ${ids.length} sélectionnée(s)`,
			};
		}

		// Verifier qu'aucune variante par defaut n'est selectionnee
		const defaultSkus = skusData.filter((s) => s.isDefault);
		if (defaultSkus.length > 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de supprimer une variante par défaut",
			};
		}

		// CRITIQUE : Verifier qu'aucun produit ne se retrouve avec 0 SKU
		const deletionsByProduct = new Map<
			string,
			{
				total: number;
				deleteCount: number;
				activeDeleteCount: number;
				activeTotal: number;
				status: string;
			}
		>();
		for (const sku of skusData) {
			const existing = deletionsByProduct.get(sku.productId);
			if (existing) {
				existing.deleteCount++;
				if (sku.isActive) existing.activeDeleteCount++;
			} else {
				deletionsByProduct.set(sku.productId, {
					total: sku.product._count.skus,
					deleteCount: 1,
					activeDeleteCount: sku.isActive ? 1 : 0,
					activeTotal: sku.product.skus.length,
					status: sku.product.status,
				});
			}
		}

		for (const [, data] of deletionsByProduct) {
			if (data.total - data.deleteCount < 1) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Impossible de supprimer toutes les variantes d'un produit. Un produit doit avoir au moins une variante.",
				};
			}

			// Pour les produits PUBLIC : au moins 1 SKU actif doit rester
			if (data.status === "PUBLIC" && data.activeTotal - data.activeDeleteCount < 1) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Impossible de supprimer toutes les variantes actives d'un produit PUBLIC. " +
						"Veuillez creer une autre variante active ou mettre le produit en DRAFT.",
				};
			}
		}

		// CRITIQUE : Verifier que les SKUs ne sont pas dans des commandes
		const orderItemsCount = await prisma.orderItem.count({
			where: { skuId: { in: ids } },
		});

		if (orderItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Impossible de supprimer ces variantes car ${orderItemsCount} sont liees a des commandes. ` +
					"Pour conserver l'historique, veuillez désactiver ces variantes à la place.",
			};
		}

		// CRITIQUE : Verifier que les SKUs ne sont pas dans des paniers
		const cartItemsCount = await prisma.cartItem.count({
			where: { skuId: { in: ids } },
		});

		if (cartItemsCount > 0) {
			return {
				status: ActionStatus.ERROR,
				message:
					`Impossible de supprimer ces variantes car ${cartItemsCount} sont presentes dans des paniers. ` +
					"Veuillez désactiver ces variantes à la place.",
			};
		}

		// Supprimer toutes les variantes AVANT les fichiers UploadThing
		const allImageUrls = skusData.flatMap((sku) => sku.images.map((img) => img.url));
		await prisma.productSku.deleteMany({
			where: { id: { in: ids } },
		});

		// Supprimer les fichiers UploadThing apres la suppression DB reussie
		await deleteUploadThingFilesFromUrls(allImageUrls);

		// Invalider le cache (deduplique automatiquement les tags)
		const uniqueTags = collectBulkInvalidationTags(skusData);
		// Invalider les caches FOMO "dans X paniers" pour chaque produit affecté
		const productIds = new Set(skusData.map((s) => s.productId));
		for (const productId of productIds) {
			uniqueTags.add(CART_CACHE_TAGS.PRODUCT_CARTS(productId));
		}
		invalidateTags(uniqueTags);

		// Audit log
		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "sku.bulkDelete",
			targetType: "sku",
			targetId: ids.join(","),
			metadata: { count: ids.length },
		});

		return {
			status: ActionStatus.SUCCESS,
			message: `${ids.length} variante(s) supprimée(s) avec succès`,
		};
	} catch (e) {
		return handleActionError(e, "Impossible de supprimer les variantes");
	}
}
