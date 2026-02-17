"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCartInvalidationTags, CART_CACHE_TAGS } from "@/modules/cart/constants/cache";
import { CART_LIMITS } from "@/shared/lib/rate-limit-config";
import { validateInput, handleActionError, success, error, BusinessError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import { getCartExpirationDate, getOrCreateCartSessionId } from "@/modules/cart/lib/cart-session";
import { checkCartRateLimit } from "@/modules/cart/lib/cart-rate-limit";
import { addToCartSchema } from "../schemas/cart.schemas";
import { MAX_CART_ITEMS } from "../constants/cart";

/**
 * Server Action pour ajouter un article au panier
 * Compatible avec useActionState de React 19
 *
 * Rate limiting configuré via CART_LIMITS.ADD
 */
export async function addToCart(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Extraction des données du FormData
		const rawData = {
			skuId: formData.get("skuId") as string,
			quantity: Number(formData.get("quantity")) || 1,
		};

		// 2. Validation avec Zod
		const validated = validateInput(addToCartSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 3. Rate limiting + récupération contexte
		const rateLimitResult = await checkCartRateLimit(CART_LIMITS.ADD, { createSessionIfMissing: true });
		if (!rateLimitResult.success) {
			return rateLimitResult.errorState;
		}
		let { userId, sessionId } = rateLimitResult.context;

		// 4. Vérifier que l'userId existe dans la base de données
		// Si l'userId n'existe pas, traiter comme un utilisateur non connecté
		if (userId) {
			const userExists = await prisma.user.findUnique({
				where: { id: userId },
				select: { id: true },
			});

			if (!userExists) {
				userId = undefined;
				sessionId = await getOrCreateCartSessionId();
			}
		}

		// 5. Vérifier que sessionId est bien défini pour les visiteurs
		if (!userId && !sessionId) {
			return error("Impossible de creer une session panier. Veuillez reessayer.");
		}

		// 5b. Check distinct item count to prevent cart bloat
		// Filter out expired guest carts (not yet cleaned by cron) to avoid false rejections
		const existingCart = await prisma.cart.findFirst({
			where: {
				...(userId ? { userId } : { sessionId: sessionId! }),
				OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
			},
			select: { _count: { select: { items: true } } },
		});

		if (existingCart && existingCart._count.items >= MAX_CART_ITEMS) {
			return error(CART_ERROR_MESSAGES.CART_ITEMS_LIMIT(MAX_CART_ITEMS));
		}

		// 6. Transaction: Trouver ou créer le panier, ajouter/mettre à jour l'item
		const transactionResult = await prisma.$transaction(async (tx) => {
			// 6a. Verrouiller le SKU en PREMIER avec FOR UPDATE pour éviter les race conditions
			// Le lock doit être acquis AVANT de lire existingItem pour garantir la cohérence
			const skuRows = await tx.$queryRaw<Array<{
				inventory: number;
				isActive: boolean;
				priceInclTax: number;
				deletedAt: Date | null;
				productId: string;
				productStatus: string;
				productDeletedAt: Date | null;
			}>>`
				SELECT
					s.inventory,
					s."isActive",
					s."priceInclTax",
					s."deletedAt",
					s."productId",
					p.status AS "productStatus",
					p."deletedAt" AS "productDeletedAt"
				FROM "ProductSku" s
				JOIN "Product" p ON s."productId" = p.id
				WHERE s.id = ${validatedData.skuId}
				FOR UPDATE OF s
			`;

			const sku = skuRows[0];

			// Validation complète du SKU (toutes les vérifications dans la transaction)
			if (!sku) {
				throw new BusinessError(CART_ERROR_MESSAGES.SKU_NOT_FOUND);
			}

			if (sku.deletedAt || sku.productDeletedAt) {
				throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_DELETED);
			}

			if (!sku.isActive) {
				throw new BusinessError(CART_ERROR_MESSAGES.SKU_INACTIVE);
			}

			if (sku.productStatus !== "PUBLIC") {
				throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
			}

			// 6b. Upsert panier (après validation SKU pour ne pas créer de panier inutile)
			const cart = await tx.cart.upsert({
				where: userId ? { userId } : { sessionId: sessionId! },
				create: {
					userId: userId || null,
					sessionId: sessionId || null,
					expiresAt: userId ? null : getCartExpirationDate(),
				},
				update: {
					expiresAt: userId ? null : getCartExpirationDate(),
					updatedAt: new Date(),
				},
			});

			// 6c. Lire existingItem APRÈS le lock FOR UPDATE pour éviter les race conditions
			const existingItem = await tx.cartItem.findUnique({
				where: {
					cartId_skuId: {
						cartId: cart.id,
						skuId: validatedData.skuId,
					},
				},
			});

			let cartItem;
			let newQuantity;
			let isUpdate = false;

			if (existingItem) {
				newQuantity = existingItem.quantity + validatedData.quantity;

				// Vérification du stock (message générique pour ne pas révéler le stock exact)
				if (sku.inventory < newQuantity) {
					throw new BusinessError(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(sku.inventory));
				}

				// Mettre à jour le CartItem
				cartItem = await tx.cartItem.update({
					where: { id: existingItem.id },
					data: {
						quantity: newQuantity,
					},
				});

				isUpdate = true;
			} else {
				newQuantity = validatedData.quantity;

				// Vérification du stock (message générique pour ne pas révéler le stock exact)
				if (sku.inventory === 0) {
					throw new BusinessError(CART_ERROR_MESSAGES.OUT_OF_STOCK);
				}

				if (sku.inventory < validatedData.quantity) {
					throw new BusinessError(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK(sku.inventory));
				}

				// Créer le CartItem avec le prix récupéré dans la transaction (atomique)
				cartItem = await tx.cartItem.create({
					data: {
						cartId: cart.id,
						skuId: validatedData.skuId,
						quantity: validatedData.quantity,
						priceAtAdd: sku.priceInclTax,
					},
				});
			}

			return { cartItem, newQuantity, isUpdate, productId: sku.productId };
		});

		// 7. Invalider immédiatement le cache du panier (read-your-own-writes)
		// Note: updateTag suffit car les cache tags couvrent toutes les données panier
		const tags = getCartInvalidationTags(userId, sessionId || undefined);
		tags.forEach(tag => updateTag(tag));

		// 8. Invalider le cache du compteur de paniers pour ce produit (FOMO "dans X paniers")
		updateTag(CART_CACHE_TAGS.PRODUCT_CARTS(transactionResult.productId));

		// 9. Success - Return ActionState format
		const successMessage = transactionResult.isUpdate
			? `Quantité mise à jour (${transactionResult.newQuantity})`
			: "Article ajouté au panier";

		return success(successMessage, {
			cartItemId: transactionResult.cartItem.id,
			quantity: transactionResult.newQuantity,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'ajout au panier");
	}
}
