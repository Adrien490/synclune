"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_DELETE_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
	validateInput,
	BusinessError,
} from "@/shared/lib/actions";
import { deleteProductSkuSchema } from "../schemas/sku.schemas";
import { deleteUnreferencedCatalogMedia } from "@/modules/media/services/delete-unreferenced-catalog-media.service";
import { getSkuInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour supprimer une variante de produit
 * Supprime egalement toutes les images associees :
 * - Fichiers UploadThing (via UTApi)
 * - Entrees base de donnees SkuMedia (cascade Prisma)
 * Compatible avec useActionState de React 19
 */
export async function deleteProductSku(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_DELETE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction des donnees du FormData
		const rawData = {
			skuId: safeFormGet(formData, "skuId"),
		};

		// 4. Validation avec Zod
		const validation = validateInput(deleteProductSkuSchema, rawData);
		if ("error" in validation) return validation.error;

		const { skuId: validatedSkuId } = validation.data;

		// 5. Verifier que le SKU existe et recuperer toutes les infos necessaires en UNE requete
		// Optimisation: Consolider les counts pour eviter les N+1 queries
		// `deletedAt: null` — un SKU soft-deleted appartient à un produit lui-même
		// supprimé : le hard-deleter par cette action serait une anomalie (et son
		// `_count.skus` filtré exclurait la ligne éditée).
		const existingSku = await prisma.productSku.findUnique({
			where: { id: validatedSkuId, deletedAt: null },
			select: {
				id: true,
				sku: true,
				isDefault: true,
				isActive: true,
				productId: true,
				images: {
					select: {
						url: true,
					},
				},
				colors: {
					select: { colorId: true, color: { select: { slug: true } } },
				},
				materials: {
					select: { materialId: true, material: { select: { slug: true } } },
				},
				product: {
					select: {
						title: true,
						slug: true,
						status: true,
						_count: {
							select: {
								skus: { where: { deletedAt: null } },
							},
						},
						skus: {
							where: { isActive: true, deletedAt: null },
							select: { id: true },
						},
					},
				},
				// Counts des relations bloquantes
				_count: {
					select: {
						orderItems: true,
					},
				},
			},
		});

		if (!existingSku) {
			return notFound("Variante de produit");
		}

		// 6. Verifier qu'il y a au moins 2 SKUs pour le produit
		if (existingSku.product._count.skus <= 1) {
			return error(
				"Impossible de supprimer la dernière variante d'un produit. Un produit doit avoir au moins une variante.",
			);
		}

		// 7. CRITIQUE : Verifier que le SKU n'est pas associe a des commandes
		// Prisma a onDelete: Restrict sur OrderItem.sku, mais on affiche un message explicite
		const orderItemsCount = existingSku._count.orderItems;

		if (orderItemsCount > 0) {
			return error(
				`Cette variante ne peut pas être supprimée car elle est associée à ${orderItemsCount} article${orderItemsCount > 1 ? "s" : ""} de commande. ` +
					"Pour conserver l'historique des commandes, veuillez désactiver cette variante à la place.",
			);
		}

		// 8. La garde « présente dans N paniers » a DISPARU avec le passage du panier
		// en cookie (2026-08-04) : il n'existe plus ni table `CartItem` ni FK
		// `onDelete: Restrict` à anticiper, et le serveur n'a aucune visibilité sur
		// les paniers des visiteurs — ils vivent dans leurs navigateurs.
		//
		// Conséquence assumée : supprimer une variante présente dans le panier de
		// quelqu'un est désormais possible. Ce n'est pas une perte de sûreté — la
		// ligne devient simplement inerte (`getCart()` écarte un SKU soft-deleted,
		// `validateCart` la signale, et le checkout la refuse sous verrou) — mais la
		// suppression est plus permissive qu'avant. La garde `orderItems`, elle,
		// reste : elle protège l'historique comptable.

		// 9. Pour les produits PUBLIC : verifier qu'il reste au moins 1 SKU actif apres suppression
		// activeSkusCount deja charge dans la requete initiale
		if (existingSku.product.status === "PUBLIC" && existingSku.isActive) {
			const activeSkusCount = existingSku.product.skus.length;

			if (activeSkusCount <= 1) {
				return error(
					"Impossible de supprimer la dernière variante active d'un produit PUBLIC. Veuillez créer une autre variante active ou mettre le produit en DRAFT.",
				);
			}
		}

		// 10. Promote fallback SKU + delete in a single transaction for atomicity
		const imageUrls = existingSku.images.map((img) => img.url);

		const promotedSkuSku = await prisma.$transaction(async (tx) => {
			// Re-check sous transaction : un OrderItem a pu apparaître entre le check
			// de l'étape 7 (hors tx) et le DELETE. Sans ce re-check, la FK Restrict
			// ferait échouer le delete en P2003 générique — on préfère refuser avec un
			// message métier explicite. (Plus de re-check panier : cf. étape 8.)
			const orderItemsNow = await tx.orderItem.count({ where: { skuId: validatedSkuId } });
			if (orderItemsNow > 0) {
				throw new BusinessError(
					"Cette variante vient d'être associée à une commande. Pour conserver l'historique, veuillez la désactiver à la place.",
				);
			}

			let promoted: string | null = null;

			if (existingSku.isDefault && existingSku.product._count.skus > 1) {
				// Find another active SKU to promote (never a soft-deleted one : il
				// serait invisible du storefront et hors de l'index unique partiel
				// ProductSku_productId_isDefault_unique, scoped deletedAt IS NULL)
				const candidateSku = await tx.productSku.findFirst({
					where: {
						productId: existingSku.productId,
						id: { not: validatedSkuId },
						isActive: true,
						deletedAt: null,
					},
					orderBy: [{ createdAt: "asc" }],
					select: { id: true, sku: true },
				});

				// Aucun repli sur un SKU INACTIF : `set-default-sku.ts`,
				// `update-sku-status.ts` et `update-product.ts` refusent tous les trois
				// l'etat « defaut inactif ». Promouvoir un inactif ici fabriquait donc un
				// etat que le reste du module traite comme invalide. Sans candidat actif,
				// le produit reste sans defaut — reparable via « Definir par defaut »
				// apres reactivation d'une variante.
				const fallbackSku = candidateSku;

				if (fallbackSku) {
					await tx.productSku.update({
						where: { id: fallbackSku.id },
						data: { isDefault: true },
					});
					promoted = fallbackSku.sku;
				}
			}

			// Delete the SKU (SkuMedia cascade-deleted by Prisma)
			//
			// La suppression est refusée dès qu'il existe un `orderItem` (garde ci-dessus) :
			// aucune pièce comptable n'est jamais détruite ici, seulement un article qui
			// n'a jamais existé commercialement.
			await tx.productSku.delete({
				where: { id: validatedSkuId },
			});

			return promoted;
		});

		// 11. Supprimer les fichiers UploadThing apres la suppression DB reussie —
		// via la SSOT qui préserve les URLs encore référencées par une autre ligne
		// SkuMedia (blobs partagés par duplication). Le refus `orderItemsCount > 0`
		// en amont couvre déjà les snapshots de commande de CE SKU, mais pas un
		// blob partagé avec le SKU d'origine d'une duplication.
		await deleteUnreferencedCatalogMedia(imageUrls, { action: "deleteProductSku" });

		// 12. Invalider les cache tags concernes
		// Toutes les couleurs/matériaux liés perdent un lien (`_count.skuColors`
		// + KPI distinct products) → cascade vers caches admin colors/materials.
		const tags = getSkuInvalidationTags(
			existingSku.sku,
			existingSku.productId,
			existingSku.product.slug,
			validatedSkuId, // Invalide aussi le cache stock temps réel
			existingSku.colors.map((c) => c.color.slug),
			existingSku.colors.map((c) => c.colorId),
			existingSku.materials.map((m) => m.material.slug),
			existingSku.materials.map((m) => m.materialId),
		);
		tags.forEach((tag) => updateTag(tag));

		// 13. Audit log

		// 14. Success
		const successMessage = promotedSkuSku
			? `Variante ${existingSku.sku} supprimée avec succès. La variante ${promotedSkuSku} est maintenant la variante principale.`
			: `Variante ${existingSku.sku} supprimée avec succès.`;

		return success(successMessage, {
			skuId: validatedSkuId,
			sku: existingSku.sku,
			productTitle: existingSku.product.title,
			promotedSku: promotedSkuSku,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la suppression de la variante");
	}
}
