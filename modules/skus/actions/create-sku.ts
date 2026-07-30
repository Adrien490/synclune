"use server";

import * as Sentry from "@sentry/nextjs";

import { Prisma } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SKU_CREATE_LIMIT } from "@/shared/lib/rate-limit-config";
import { prisma } from "@/shared/lib/prisma";
import { TX_TIMEOUT_LONG, TX_MAX_WAIT_LONG } from "@/shared/lib/prisma-tx-options";
import { updateTag } from "next/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validationError } from "@/shared/lib/actions";
import { createProductSkuSchema } from "../schemas/sku.schemas";
import { getSkuInvalidationTags } from "../utils/cache.utils";
import { parseMediaFromFormStrict } from "../utils/parse-media-from-form";
import {
	BusinessError,
	handleActionError,
	safeFormGet,
	safeFormGetJSON,
} from "@/shared/lib/actions";
import { generateAvailableSkuCode } from "../services/sku-generation.service";
import {
	assertColorsExist,
	assertMaterialsExist,
	assertUniqueVariantCombination,
	eurosToCents,
	normalizeMediaForPersistence,
	normalizeOptionalRefs,
	optionalEurosToCents,
	toSkuMediaCreatePayload,
	unsetOtherDefaultSkus,
} from "../services/persist-sku-helpers.service";
import { getSkuColorsLabel } from "../utils/sku-colors-label";
import { getSkuMaterialsLabel } from "../utils/sku-materials-label";

/**
 * Server Action pour creer une variante de produit (Product SKU)
 * Compatible avec useActionState de React 19
 */
export async function createProductSku(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Auth first (before rate limit to avoid non-admin token consumption)
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_SKU_CREATE_LIMIT);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Extraction des donnees du FormData
		// Parse medias from JSON string (sent as hidden input) — tableau unifié.
		const media = parseMediaFromFormStrict(formData);

		const rawData = {
			productId: safeFormGet(formData, "productId"),
			sku: safeFormGet(formData, "sku") ?? "",
			// ⚠️ Valeurs brutes transmises à Zod, PAS `Number(...) || 0`.
			// `Number("abc")` vaut `NaN`, et `NaN || 0` vaut `0` : une saisie illisible
			// devenait donc un stock de 0 accepté silencieusement. Sur `update-sku` c'est
			// pire que cosmétique — combiné à `originalInventory`, ça produit un delta
			// NÉGATIF qui vide le stock. `z.coerce.number()` rejette `NaN`, donc l'admin
			// obtient une vraie erreur de validation sur le champ fautif.
			priceInclTaxEuros: formData.get("priceInclTaxEuros") ?? undefined,
			compareAtPriceEuros: formData.get("compareAtPriceEuros")
				? Number(formData.get("compareAtPriceEuros"))
				: undefined,
			inventory: formData.get("inventory") ?? undefined,
			isActive: formData.get("isActive") === "true",
			isDefault: formData.get("isDefault") === "true",
			// Couleurs M2M sérialisées en JSON (cohérent avec materialIds + collectionIds)
			colorIds: safeFormGetJSON<string[]>(formData, "colorIds") ?? [],
			// Matériaux M2M sérialisés en JSON (cohérent avec collectionIds dans le form produit)
			materialIds: safeFormGetJSON<string[]>(formData, "materialIds") ?? [],
			size: safeFormGet(formData, "size") ?? "",
			media,
		};

		// 4. Validation avec Zod
		const result = createProductSkuSchema.safeParse(rawData);
		if (!result.success) {
			const firstError = result.error.issues[0];
			const errorPath = firstError?.path.join(".");
			return validationError(
				firstError ? `${errorPath}: ${firstError.message}` : "Données invalides.",
			);
		}

		const validatedData = result.data;

		// 5. Normalize FKs + sizes (Zod schema already trimmed + empty → undefined)
		const refs = normalizeOptionalRefs({
			colorIds: validatedData.colorIds,
			materialIds: validatedData.materialIds,
			size: validatedData.size,
		});

		// 6. Convert prices euros → centimes
		const priceInclTaxCents = eurosToCents(validatedData.priceInclTaxEuros);
		const compareAtPriceCents = optionalEurosToCents(validatedData.compareAtPriceEuros);

		// 7. Normalize media for persistence (premier item = principal, isPrimary/position auto)
		const allMedia = normalizeMediaForPersistence(validatedData.media);

		// 8. Create product SKU in transaction
		const productSku = await prisma.$transaction(
			async (tx) => {
				const product = await tx.product.findUnique({
					where: { id: validatedData.productId },
					select: { id: true, title: true },
				});
				if (!product) {
					throw new BusinessError("Le produit spécifié n'existe pas.");
				}

				await assertColorsExist(tx, refs.colorIds);
				await assertMaterialsExist(tx, refs.materialIds);
				await assertUniqueVariantCombination(tx, {
					productId: validatedData.productId,
					colorIds: refs.colorIds,
					size: refs.size,
				});

				if (validatedData.isDefault) {
					await unsetOtherDefaultSkus(tx, validatedData.productId);
				}

				// Génération du code si non fourni.
				// `generateAvailableSkuCode` retire un NOUVEAU code aléatoire à chaque
				// collision. L'ancien chemin passait par `generateUniqueTechnicalName`, conçu
				// pour la duplication : il suffixait son premier candidat en `-COPY`, donc
				// TOUS les codes auto-générés s'annonçaient comme des copies.
				const providedSku = validatedData.sku?.trim();
				let skuValue: string;
				if (providedSku) {
					skuValue = providedSku;
				} else {
					const uniqueResult = await generateAvailableSkuCode(
						async (candidate) =>
							(await tx.productSku.findUnique({
								where: { sku: candidate },
								select: { id: true },
							})) !== null,
					);
					// Union discriminée : le narrowing sur `success` donne accès à `error` d'un
					// côté et à `name` de l'autre, sans champ optionnel à re-tester.
					if (!uniqueResult.success) {
						throw new BusinessError(uniqueResult.error);
					}
					skuValue = uniqueResult.name;
				}

				const createdSku = await tx.productSku.create({
					data: {
						productId: validatedData.productId,
						sku: skuValue,
						priceInclTax: priceInclTaxCents,
						compareAtPrice: compareAtPriceCents,
						inventory: validatedData.inventory,
						isActive: validatedData.isActive,
						isDefault: validatedData.isDefault,
						size: refs.size,
						colors: {
							create: refs.colorIds.map((colorId, index) => ({
								colorId,
								position: index,
							})),
						},
						materials: {
							create: refs.materialIds.map((materialId, index) => ({
								materialId,
								position: index,
							})),
						},
					},
					include: {
						product: { select: { title: true, slug: true } },
						colors: {
							include: { color: { select: { name: true, slug: true } } },
							orderBy: { position: "asc" },
						},
						materials: {
							include: { material: { select: { name: true, slug: true } } },
							orderBy: { position: "asc" },
						},
					},
				});

				if (allMedia.length > 0) {
					await tx.skuMedia.createMany({
						data: toSkuMediaCreatePayload(createdSku.id, allMedia),
					});
				}

				return createdSku;
			},
			// Cette transaction tient advisory lock d'identité de variante + la vérification d'unicité du code SKU.
			// Le défaut Prisma (5 s) la faisait échouer en P2028 sous contention avec le
			// webhook d'encaissement, qui verrouille les mêmes lignes avec 30 s — l'admin
			// voyait une erreur générique non déterministe. Prescrit par prisma-tx-options.
			{ timeout: TX_TIMEOUT_LONG, maxWait: TX_MAX_WAIT_LONG },
		);

		// 9. Build success message
		const variantDetails = [
			getSkuColorsLabel(productSku.colors),
			getSkuMaterialsLabel(productSku.materials),
			productSku.size,
		]
			.filter(Boolean)
			.join(" - ");

		const successMessage = variantDetails
			? `Variante "${variantDetails}" créée avec succès pour "${productSku.product.title}".`
			: `Variante créée avec succès pour "${productSku.product.title}".`;

		// 10. Invalidate cache (immediate visibility for admin)
		// Toutes les couleurs/matériaux liés deviennent "touchés" (`_count.skuColors`
		// + `color-${id}-product-count` + détail color stats admin).
		const tags = getSkuInvalidationTags(
			productSku.sku,
			validatedData.productId,
			productSku.product.slug,
			productSku.id, // Invalide aussi le cache stock temps réel
			productSku.colors.map((c) => c.color.slug),
			productSku.colors.map((c) => c.colorId),
			productSku.materials.map((m) => m.material.slug),
			productSku.materials.map((m) => m.materialId),
		);
		tags.forEach((tag) => updateTag(tag));

		// 11. Audit log

		// 12. Success - Return ActionState format
		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				id: productSku.id,
				sku: productSku.sku,
				productId: productSku.productId,
			},
		};
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
			// Collision SKU code rare (generateAvailableSkuCode retire un nouveau code par tentative)
			// → monitoring pour detecter si le volume admin la rend frequente
			Sentry.captureMessage("SKU code collision (P2002) on createProductSku", {
				level: "warning",
				tags: { action: "createProductSku", code: "P2002" },
				extra: { target: e.meta?.target },
			});
			return {
				status: ActionStatus.ERROR,
				message: "Une variante avec ce code existe déjà.",
			};
		}
		return handleActionError(e, "Une erreur est survenue lors de la création de la variante.");
	}
}
