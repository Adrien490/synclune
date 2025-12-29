"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { bulkChangeProductStatusSchema } from "../schemas/product.schemas";
import { getCollectionInvalidationTags } from "@/modules/collections/utils/cache.utils";
import { getProductInvalidationTags } from "../constants/cache";

/**
 * Server Action pour changer le statut de plusieurs produits entre DRAFT et PUBLIC
 * Compatible avec useActionState de React 19
 */
export async function bulkChangeProductStatus(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des donnees du FormData
		const productIdsRaw = formData.get("productIds") as string;
		const targetStatus = formData.get("targetStatus") as string;

		// Parse le JSON des IDs
		let productIds: string[];
		try {
			productIds = JSON.parse(productIdsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs de produits invalide.",
			};
		}

		// 3. Validation avec Zod
		const result = bulkChangeProductStatusSchema.safeParse({
			productIds,
			targetStatus,
		});

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const validatedData = result.data;

		// 4. Verifier que tous les produits existent et ne sont pas archives
		const existingProducts = await prisma.product.findMany({
			where: {
				id: {
					in: validatedData.productIds,
				},
			},
			select: {
				id: true,
				title: true,
				slug: true,
				status: true,
				collections: { select: { collection: { select: { slug: true } } } },
			},
		});

		if (existingProducts.length !== validatedData.productIds.length) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Un ou plusieurs produits n'existent pas.",
			};
		}

		// 5. Verifier qu'aucun produit n'est archive
		const archivedProducts = existingProducts.filter(
			(p) => p.status === "ARCHIVED"
		);
		if (archivedProducts.length > 0) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message:
					"Impossible de changer le statut de produits archives. Veuillez d'abord les restaurer.",
			};
		}

		// 6. Mettre a jour le statut
		await prisma.product.updateMany({
			where: {
				id: {
					in: validatedData.productIds,
				},
			},
			data: {
				status: validatedData.targetStatus,
			},
		});

		// 7. Invalidate cache tags pour tous les produits
		for (const product of existingProducts) {
			const productTags = getProductInvalidationTags(product.slug, product.id);
			productTags.forEach(tag => updateTag(tag));
		}

		// 7.1 Invalider les caches des collections associees (deduplique)
		const collectionSlugs = new Set<string>();
		for (const product of existingProducts) {
			for (const productCollection of product.collections) {
				collectionSlugs.add(productCollection.collection.slug);
			}
		}
		for (const slug of collectionSlugs) {
			getCollectionInvalidationTags(slug).forEach((tag) => updateTag(tag));
		}

		// 8. Message de succes
		const count = existingProducts.length;
		const actionLabel =
			validatedData.targetStatus === "PUBLIC" ? "publié" : "mis en brouillon";
		const successMessage = `${count} produit${count > 1 ? "s" : ""} ${actionLabel}${count > 1 ? "s" : ""} avec succès`;

		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				productIds: validatedData.productIds,
				count,
				targetStatus: validatedData.targetStatus,
				products: existingProducts.map((p) => ({
					id: p.id,
					title: p.title,
					slug: p.slug,
				})),
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors du changement de statut.",
		};
	}
}
