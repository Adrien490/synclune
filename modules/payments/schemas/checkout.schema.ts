import { z } from "zod";
import { ADDRESS_CONSTANTS } from "@/shared/constants/address.constants";
import {
	addressLineOptionalSchema,
	addressLineSchema,
	citySchema,
	postalCodeSchema,
	shippingCountrySchema,
} from "@/shared/schemas/address.schema";
import { emailOptionalSchema } from "@/shared/schemas/email.schemas";
import { phoneSchema } from "@/shared/schemas/phone.schemas";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";
import { discountCodeSchema } from "@/modules/discounts/schemas/discount.schemas";
import { parseFullName } from "../utils/parse-full-name";

// Longueurs alignées sur les colonnes Prisma Order.shipping* (VarChar 50/255/100/10).
// `fullName` est splitté par parseFullName en firstName/lastName (VarChar(50) chacun) :
// le refine garantit qu'aucune des deux parties ne dépasse la colonne DB.
//
// Les bornes vivent dans `ADDRESS_CONSTANTS` (SSOT), pas ici : les validateurs inline
// de `checkout-address-fields.tsx` en dérivent aussi, et les re-poser à la main de
// chaque côté est exactement ce qui avait laissé le client accepter une saisie que le
// serveur refuse. Les importer depuis ce module aurait en prime tiré tout le graphe
// Zod du checkout dans le bundle client.
const { MAX_FULL_NAME_LENGTH, MAX_POSTAL_CODE_LENGTH } = ADDRESS_CONSTANTS;

const addressSchema = z.object({
	fullName: z
		.string()
		.min(2, "Le nom complet doit contenir au moins 2 caractères")
		.max(
			MAX_FULL_NAME_LENGTH,
			`Le nom complet ne peut pas dépasser ${MAX_FULL_NAME_LENGTH} caractères`,
		)
		.trim()
		.refine((value) => {
			const { firstName, lastName } = parseFullName(value);
			return (
				firstName.length <= ADDRESS_CONSTANTS.MAX_NAME_LENGTH &&
				lastName.length <= ADDRESS_CONSTANTS.MAX_NAME_LENGTH
			);
		}, `Le prénom et le nom ne peuvent pas dépasser ${ADDRESS_CONSTANTS.MAX_NAME_LENGTH} caractères chacun`)
		// `parseFullName` rend `lastName: ""` quand la saisie ne contient aucun espace
		// (« Léane ») : `Order.shippingLastName` recevait alors une chaîne vide, figée
		// 10 ans dans le snapshot d'adresse et imprimée telle quelle sur la facture
		// (Art. 286 CGI). Exiger les deux parties ici, à la seule frontière où la
		// saisie est encore corrigeable par le client.
		.refine(
			(value) => parseFullName(value).lastName.length > 0,
			"Indique ton prénom et ton nom (ex : Léane Dupont)",
		),
	// Briques partagées (`shared/schemas/address.schema.ts`) : mêmes contraintes que
	// l'édition d'adresse admin, posées une seule fois.
	addressLine1: addressLineSchema,
	addressLine2: addressLineOptionalSchema,
	city: citySchema,
	postalCode: postalCodeSchema,
	country: shippingCountrySchema,
	phoneNumber: phoneSchema,
});

const cartItemSchema = z.object({
	skuId: z.cuid2("ID SKU invalide"),
	quantity: z
		.number()
		.int()
		.positive()
		.max(MAX_QUANTITY_PER_ORDER, `Maximum ${MAX_QUANTITY_PER_ORDER} unités par article`),
	priceAtAdd: z.number().int().positive(),
});

/**
 * Lignes de commande soumises par le client, partagées par `initializePayment` et
 * `confirmCheckout`.
 *
 * ⚠️ Invariant de facturation (audit CHECKOUT-BOUNDS-001) : ces lignes viennent du
 * CLIENT, jamais du panier serveur. L'autorité reste (1) le prix DB re-vérifié
 * contre `priceAtAdd`, (2) le stock re-vérifié `FOR UPDATE` dans
 * `order-creation.service.ts`, et (3) les bornes ci-dessous. Elles doivent donc
 * refléter exactement les limites que le panier applique côté mutation
 * (`add-to-cart`, `move-to-cart`) :
 *  - `max(MAX_CART_ITEMS)` : sans plafond, un tableau arbitrairement long fait
 *    exploser le `Promise.all` de `getSkuDetails` (N requêtes DB pour des skuId
 *    inexistants, qui ratent le cache par-skuId) puis N verrous `FOR UPDATE` dans
 *    une transaction de 30 s.
 *  - unicité des `skuId` : la vérification de stock (création ET webhook) compare
 *    `inventory` LIGNE PAR LIGNE. Deux lignes du même SKU passent chacune le
 *    contrôle puis cumulent leur décrément → violation du CHECK
 *    `ProductSku_inventory_non_negative` DANS la transaction webhook, hors des
 *    chemins typés OversellError/AmountMismatch : client débité, commande jamais
 *    PAID. Empiler des lignes contournait aussi `MAX_QUANTITY_PER_ORDER`.
 */
const cartItemsSchema = z
	.array(cartItemSchema)
	.min(1, "Le panier doit contenir au moins un article")
	.max(MAX_CART_ITEMS, `Maximum ${MAX_CART_ITEMS} articles distincts par commande`)
	.refine(
		(items) => new Set(items.map((item) => item.skuId)).size === items.length,
		"Un article apparaît en double dans le panier. Actualise la page.",
	);

/**
 * Identifiant de PaymentIntent Stripe.
 *
 * SSOT partagée par les trois actions de paiement : le préfixe `pi_` était vérifié
 * par un `.startsWith()` inline dans `confirmCheckout`, et par un
 * `paymentIntentId.startsWith("pi_")` en TypeScript nu — donc sans borne de
 * longueur — dans `cancelOrphanPaymentIntent`. Les ids Stripe font ~27 caractères ;
 * la borne évite qu'une chaîne arbitrairement longue parte en appel API sortant.
 */
export const paymentIntentIdSchema = z
	.string()
	.startsWith("pi_", "Payment Intent ID invalide")
	.max(255, "Payment Intent ID invalide");

export const confirmCheckoutSchema = z.object({
	cartItems: cartItemsSchema,
	shippingAddress: addressSchema,
	email: emailOptionalSchema,
	discountCode: discountCodeSchema.optional(),
	paymentIntentId: paymentIntentIdSchema,
	// Montant AFFICHÉ au client sur le bouton « Commander et payer » (centimes).
	// Garde de CONSENTEMENT uniquement (CHECKOUT-CONSENT-001) : sur hit idempotent,
	// `confirmCheckout` refuse de laisser payer une commande dont le `total` figé
	// dépasse ce que le client voit à l'écran. Jamais utilisé pour facturer — le
	// montant autoritaire reste `order.total`, recalculé serveur. Optionnel : un
	// client legacy qui ne l'envoie pas garde le comportement d'avant.
	displayedTotal: z.number().int().nonnegative().optional(),
});

export type ConfirmCheckoutData = z.infer<typeof confirmCheckoutSchema>;

// L'email reste optionnel ici : le PaymentIntent est créé au montage de la page
// paiement, AVANT que l'invité ait saisi son email (usePaymentIntent). La garde
// « email requis pour une commande invité » est appliquée dans confirmCheckout.
export const initializePaymentSchema = z.object({
	cartItems: cartItemsSchema,
	email: emailOptionalSchema,
});
