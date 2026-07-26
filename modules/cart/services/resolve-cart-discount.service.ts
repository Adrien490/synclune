import { calculateDiscountWithExclusion } from "@/modules/discounts/services/discount-calculation.service";
import { checkDiscountEligibility } from "@/modules/discounts/services/discount-eligibility.service";
import type {
	CartItemForDiscount,
	DiscountValidation,
} from "@/modules/discounts/types/discount.types";

/**
 * Item minimal nécessaire au calcul d'une remise panier.
 * Volontairement structurel (pas le type Prisma) pour rester testable sans DB.
 */
export interface CartItemForCartDiscount {
	quantity: number;
	sku: { priceInclTax: number; compareAtPrice: number | null };
}

export interface ResolvedCartDiscount {
	/** Code à afficher, `null` si le code n'est plus applicable. */
	appliedDiscountCode: string | null;
	/** Montant de la remise en centimes, `null` si aucune remise applicable. */
	discountAmountCache: number | null;
}

/**
 * Re-dérive la remise affichée dans le panier à partir des articles COURANTS.
 *
 * [[CART-DISCOUNT-001]] `Cart.discountAmountCache` est un snapshot figé à
 * l'application du code (`apply-cart-discount`). Aucune mutation d'article
 * (ajout, changement de quantité, suppression, retrait d'indisponibles,
 * déplacement vers la wishlist, réassort…) ne le recalculait : le panier
 * affichait donc une réduction obsolète — par ex. « −40,00 € » sur un sous-total
 * retombé à 20,00 €, ou une remise maintenue alors que le panier était repassé
 * sous `minOrderAmount`. Une fausse promesse de prix.
 *
 * Plutôt que de recalculer dans chacune des ~6 actions de mutation (facile à
 * oublier pour la 7ᵉ), la dérivation se fait au SEUL point de lecture
 * (`fetchCart`). Le montant affiché suit donc toujours le contenu réel du
 * panier, et un code devenu inéligible (expiré, désactivé, quota global
 * atteint, minimum non atteint) disparaît de l'affichage.
 *
 * Portée délibérée : la limite PAR UTILISATEUR (`maxUsagePerUser`) n'est PAS
 * vérifiée ici — elle exigerait deux `count` par lecture de panier, et le
 * contrôle autoritaire a lieu sous verrou à la création de la commande
 * (`order-creation.service.ts`). Un panier peut donc afficher une remise que le
 * checkout refusera : c'est le bon compromis (le refus est explicite et le
 * montant facturé reste toujours recalculé serveur).
 *
 * Fonction pure : aucune I/O. L'appelant fournit le discount déjà résolu.
 */
export function resolveCartDiscount(
	appliedDiscountCode: string | null,
	discount: DiscountValidation | null,
	items: readonly CartItemForCartDiscount[],
	userId?: string,
): ResolvedCartDiscount {
	const CLEARED: ResolvedCartDiscount = { appliedDiscountCode: null, discountAmountCache: null };

	if (!appliedDiscountCode || !discount || items.length === 0) {
		return CLEARED;
	}

	const cartItems: CartItemForDiscount[] = items.map((item) => ({
		priceInclTax: item.sku.priceInclTax,
		quantity: item.quantity,
		compareAtPrice: item.sku.compareAtPrice,
	}));

	const subtotal = cartItems.reduce((sum, item) => sum + item.priceInclTax * item.quantity, 0);

	// `usageCounts` omis → `checkDiscountEligibility` saute la limite par
	// utilisateur (cf. portée ci-dessus) et vérifie isActive / fenêtre de
	// validité / minOrderAmount / quota global.
	const eligibility = checkDiscountEligibility(discount, { subtotal, userId }, undefined);
	if (!eligibility.eligible) {
		return CLEARED;
	}

	const discountAmount = calculateDiscountWithExclusion({
		type: discount.type,
		value: discount.value,
		cartItems,
		excludeSaleItems: true,
	});

	// Une remise nulle (panier 100 % soldé) ne doit pas afficher « −0,00 € ».
	if (discountAmount <= 0) {
		return CLEARED;
	}

	return { appliedDiscountCode: discount.code, discountAmountCache: discountAmount };
}
