import { cookies } from "next/headers";
import { CART_EXPIRATION_DAYS } from "@/modules/cart/constants/expiration";
import { MAX_CART_ITEMS, MAX_QUANTITY_PER_ORDER } from "@/modules/cart/constants/cart";

/**
 * Cookie du panier : SSOT du panier depuis le retrait de la base (2026-08-04),
 * sur le modèle de `wishlist-cookie.ts`. Le cookie porte directement les lignes
 * (VARIANT, quantité, prix constaté à l'ajout) — il n'y a plus ni table `Cart` ni
 * table `CartItem`. Plus de code promo non plus : les `Discount` ont été retirés
 * le 2026-08-05, avec la clé `d` de la forme sérialisée. Un ancien cookie qui la
 * porte encore reste lisible — les clés inconnues sont simplement ignorées.
 */
const CART_COOKIE_NAME = "cart";

/**
 * Durée de vie : 7 jours, glissants — `writeCartCookie()` re-pose le cookie avec
 * un maxAge complet à chaque mutation, ce qui remplace le `Cart.expiresAt`
 * glissant de l'architecture DB.
 */
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * CART_EXPIRATION_DAYS; // 7 jours en secondes

/**
 * Forme cuid2 (même famille que `z.cuid2()` : minuscule + alphanumériques),
 * bornée à 32 caractères — un cookie est une entrée client arbitraire, la borne
 * évite qu'une valeur forgée gonfle lectures et requêtes.
 */
const CUID2_LIKE_REGEX = /^[a-z][a-z0-9]{1,31}$/;

/**
 * Plafond de prix accepté dans le cookie (10 000 € en centimes).
 *
 * ⚠️ Ce n'est PAS une garde de facturation : `priceAtAdd` est un témoin
 * d'affichage, jamais une base de calcul. Le checkout re-lit `variant.priceCents`
 * en base (`computeCartSubtotal`) et refuse la commande si le témoin diverge
 * (`confirm-checkout.ts`, étape 6). La borne ne sert qu'à empêcher un cookie
 * forgé d'afficher un total absurde avant d'être rejeté.
 */
const MAX_PRICE_AT_ADD = 1_000_000;

/** Une ligne du panier telle qu'elle vit dans le cookie. */
interface CartCookieItem {
	variantId: string;
	quantity: number;
	/**
	 * Prix TTC unitaire constaté à l'ajout, en centimes. Témoin d'affichage et
	 * base de l'alerte « le prix a changé » — jamais la base du montant facturé.
	 */
	priceAtAdd: number;
}

export interface CartCookieValue {
	items: CartCookieItem[];
}

const EMPTY_CART: CartCookieValue = { items: [] };

/**
 * Forme sérialisée, volontairement compacte : `{"i":[[variantId,qty,price]]}`.
 *
 * ⚠️ Budget 4 Ko. Next sérialise la valeur avec `encodeURIComponent`, donc chaque
 * caractère de ponctuation JSON (`[`, `]`, `"`, `,`) coûte 3 octets une fois
 * encodé, pas 1. Une ligne pèse ~54 octets encodés (25 pour le cuid2, ~29 pour la
 * ponctuation et les nombres) : à `MAX_CART_ITEMS` = 50, le cookie plafonne vers
 * 2,7 Ko. Relever `MAX_CART_ITEMS` impose de refaire ce calcul.
 */
type SerializedItem = [variantId: string, quantity: number, priceAtAdd: number];
interface SerializedCart {
	i?: unknown;
}

function isPositiveInt(value: unknown, max: number): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= max;
}

function parseItem(entry: unknown): CartCookieItem | null {
	if (!Array.isArray(entry)) return null;

	const [variantId, quantity, priceAtAdd] = entry as Partial<SerializedItem>;

	if (typeof variantId !== "string" || !CUID2_LIKE_REGEX.test(variantId)) return null;
	if (!isPositiveInt(quantity, MAX_QUANTITY_PER_ORDER)) return null;
	// `priceAtAdd` peut valoir 0 (article offert) — borne basse à 0, pas à 1.
	if (
		typeof priceAtAdd !== "number" ||
		!Number.isInteger(priceAtAdd) ||
		priceAtAdd < 0 ||
		priceAtAdd > MAX_PRICE_AT_ADD
	) {
		return null;
	}

	return { variantId, quantity, priceAtAdd };
}

/**
 * Lit le panier depuis le cookie.
 *
 * Tolérante par construction (le cookie est une entrée client) : JSON invalide,
 * forme inattendue, lignes malformées ou dupliquées sont silencieusement
 * écartées, et la liste est tronquée à `MAX_CART_ITEMS`.
 *
 * L'ordre est celui du cookie — `writeCartCookie` range le plus récemment
 * ajouté en tête, ce qui reproduit l'`orderBy: { createdAt: "desc" }` de l'ancien
 * `GET_CART_SELECT`.
 */
export async function readCartCookie(): Promise<CartCookieValue> {
	const cookieStore = await cookies();
	const raw = cookieStore.get(CART_COOKIE_NAME)?.value;
	if (!raw) return EMPTY_CART;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return EMPTY_CART;
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return EMPTY_CART;
	}

	const { i } = parsed as SerializedCart;

	const items: CartCookieItem[] = [];
	if (Array.isArray(i)) {
		const seen = new Set<string>();
		for (const entry of i) {
			const item = parseItem(entry);
			if (!item || seen.has(item.variantId)) continue;
			seen.add(item.variantId);
			items.push(item);
			if (items.length >= MAX_CART_ITEMS) break;
		}
	}

	if (items.length === 0) return EMPTY_CART;

	return { items };
}

/**
 * Écrit le panier dans le cookie (maxAge complet — expiration glissante).
 *
 * ⚠️ À appeler uniquement depuis une Server Action ou un Route Handler :
 * `cookies().set()` throw pendant un rendu de Server Component.
 */
export async function writeCartCookie(cart: CartCookieValue): Promise<void> {
	const cookieStore = await cookies();

	const items = cart.items.slice(0, MAX_CART_ITEMS);

	if (items.length === 0) {
		cookieStore.delete(CART_COOKIE_NAME);
		return;
	}

	const payload: { i: SerializedItem[] } = {
		i: items.map((item) => [item.variantId, item.quantity, item.priceAtAdd]),
	};

	cookieStore.set(CART_COOKIE_NAME, JSON.stringify(payload), {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: process.env.NODE_ENV === "production", // HTTPS en production uniquement
		sameSite: "lax", // Protection CSRF
		maxAge: CART_COOKIE_MAX_AGE,
		path: "/",
	});
}

/**
 * Supprime le cookie du panier.
 *
 * Appelé au vidage explicite (`clearCart`) et après une commande payée
 * (`clearCartAfterOrder`, déclenché depuis la page de confirmation — un webhook
 * Stripe est un appel serveur-à-serveur, il n'a aucun accès au cookie du client).
 */
export async function clearCartCookie(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(CART_COOKIE_NAME);
}
