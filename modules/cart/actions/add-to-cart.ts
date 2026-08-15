"use server";

import { prisma } from "@/shared/lib/prisma";
import {
	validateInput,
	handleActionError,
	success,
	BusinessError,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { CART_ERROR_MESSAGES } from "@/modules/cart/constants/error-messages";
import { readCartCookie, writeCartCookie } from "@/modules/cart/lib/cart-cookie";
import { addToCartSchema } from "../schemas/cart.schemas";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "../constants/cart";

/**
 * Server Action pour ajouter un article au panier
 * Compatible avec useActionState de React 19
 *
 * Le panier vit dans le cookie `cart` (SSOT `lib/cart-cookie.ts`) : cette action
 * valide le VARIANT en base, puis réécrit le cookie. Aucune invalidation de cache
 * n'est nécessaire — poser le cookie re-rend avec la nouvelle valeur, et la clé
 * du cache de matérialisation (`fetchCartVariants`) change avec la liste de VARIANTs.
 *
 */
export async function addToCart(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Extraction des données du FormData
		const rawData = {
			variantId: safeFormGet(formData, "variantId"),
			quantity: Number(formData.get("quantity")) || 1,
		};

		// 2. Validation avec Zod
		const validated = validateInput(addToCartSchema, rawData);
		if ("error" in validated) return validated.error;

		const validatedData = validated.data;

		// 5. Validation du VARIANT en base.
		//
		// ⚠️ Cette lecture reste indispensable même sans table `Cart` : sans elle, un
		// `variantId` cuid2 forgé entrerait dans le cookie et gonflerait le panier d'une
		// ligne fantôme, et le prix témoin serait choisi par le client. Elle porte
		// aussi les messages d'erreur actionnables (rupture, produit dépublié).
		//
		// Le `SELECT … FOR UPDATE` de l'architecture DB a en revanche disparu : il ne
		// protégeait rien ici. La garde de stock AUTORITAIRE est celle de
		// `order-creation.service.ts`, seul point qui tient un verrou de ligne au
		// moment où le stock est réellement engagé. Verrouiller une ligne pour écrire
		// ensuite dans un cookie n'aurait aucun effet.
		const variant = await prisma.productVariant.findUnique({
			where: { id: validatedData.variantId },
			select: {
				id: true,
				stock: true,
				active: true,
				priceCents: true,
				product: { select: { active: true, priceCents: true } },
			},
		});

		if (!variant) {
			throw new BusinessError(CART_ERROR_MESSAGES.VARIANT_NOT_FOUND);
		}
		if (!variant.product.active) {
			throw new BusinessError(CART_ERROR_MESSAGES.PRODUCT_NOT_PUBLIC);
		}
		if (!variant.active) {
			throw new BusinessError(CART_ERROR_MESSAGES.VARIANT_INACTIVE);
		}

		// 6. Fusion dans le cookie
		const cart = await readCartCookie();
		const existing = cart.items.find((item) => item.variantId === validatedData.variantId);
		const isUpdate = existing !== undefined;

		const newQuantity = existing
			? existing.quantity + validatedData.quantity
			: validatedData.quantity;

		// Enforce max quantity per order (cumulative check)
		if (newQuantity > MAX_QUANTITY_PER_ORDER) {
			throw new BusinessError(CART_ERROR_MESSAGES.QUANTITY_MAX);
		}

		// Vérification du stock (message générique pour ne pas révéler le stock exact)
		if (!isUpdate && variant.stock === 0) {
			throw new BusinessError(CART_ERROR_MESSAGES.OUT_OF_STOCK);
		}
		if (variant.stock < newQuantity) {
			throw new BusinessError(CART_ERROR_MESSAGES.INSUFFICIENT_STOCK);
		}

		// Check cart item limit before adding a new distinct item
		if (!isUpdate && cart.items.length >= MAX_CART_ITEMS) {
			throw new BusinessError(CART_ERROR_MESSAGES.CART_ITEMS_LIMIT(MAX_CART_ITEMS));
		}

		// Le plus récemment touché passe en tête : l'ordre du cookie est l'ordre
		// d'affichage (cf. `getCart`), là où l'ancien select triait sur `createdAt desc`.
		const remaining = cart.items.filter((item) => item.variantId !== validatedData.variantId);
		await writeCartCookie({
			...cart,
			items: [
				{
					variantId: validatedData.variantId,
					quantity: newQuantity,
					// Le prix témoin est TOUJOURS relu en base, jamais fourni par le client.
					priceAtAdd: variant.priceCents ?? variant.product.priceCents,
				},
				...remaining,
			],
		});

		// 7. Success - Return ActionState format
		const successMessage = isUpdate
			? `Quantité mise à jour (${newQuantity})`
			: "Article ajouté au panier";

		return success(successMessage, {
			cartItemId: validatedData.variantId,
			quantity: newQuantity,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'ajout au panier");
	}
}
