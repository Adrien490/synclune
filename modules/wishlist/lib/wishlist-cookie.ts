import { cookies } from "next/headers";
import { WISHLIST_EXPIRATION_DAYS } from "@/modules/wishlist/constants/expiration.constants";
import { WISHLIST_MAX_ITEMS } from "@/modules/wishlist/constants/wishlist.constants";

/**
 * Cookie des favoris : SSOT de la wishlist depuis le retrait de la base
 * (2026-08-03). Le cookie porte directement la liste des Product IDs (JSON
 * array, plus récent en premier) — il n'y a plus ni table `Wishlist` ni
 * identifiant de session `wishlist_session`.
 */
const WISHLIST_COOKIE_NAME = "wishlist";

/**
 * Reliquat de l'architecture DB : identifiait la ligne `Wishlist` invitée.
 * Supprimé à la première écriture du nouveau cookie (la table n'existe plus,
 * l'identifiant ne pointe vers rien).
 */
const LEGACY_WISHLIST_SESSION_COOKIE_NAME = "wishlist_session";

/**
 * Durée de vie : 30 jours, glissants — `writeWishlistCookie()` re-pose le
 * cookie avec un maxAge complet à chaque mutation (toggle/add/remove), en
 * cohérence avec la rétention annoncée sur la page confidentialité.
 */
const WISHLIST_COOKIE_MAX_AGE = 60 * 60 * 24 * WISHLIST_EXPIRATION_DAYS; // 30 jours en secondes

/**
 * Forme cuid2 (même famille que `z.cuid2()` : minuscule + alphanumériques),
 * bornée à 32 caractères — un cookie est une entrée client arbitraire, la
 * borne évite qu'une valeur forgée gonfle lectures et requêtes.
 */
const CUID2_LIKE_REGEX = /^[a-z][a-z0-9]{1,31}$/;

/**
 * Lit la liste des Product IDs favoris depuis le cookie.
 *
 * Tolérante par construction (le cookie est une entrée client) : JSON invalide,
 * non-tableau, entrées non-cuid2 ou dupliquées sont silencieusement écartés,
 * et la liste est tronquée à `WISHLIST_MAX_ITEMS`.
 *
 * @returns Product IDs, plus récent en premier (ordre d'insertion du cookie)
 */
export async function readWishlistCookie(): Promise<string[]> {
	const cookieStore = await cookies();
	const raw = cookieStore.get(WISHLIST_COOKIE_NAME)?.value;
	if (!raw) return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];

	const ids: string[] = [];
	const seen = new Set<string>();
	for (const entry of parsed) {
		if (typeof entry !== "string" || !CUID2_LIKE_REGEX.test(entry) || seen.has(entry)) {
			continue;
		}
		seen.add(entry);
		ids.push(entry);
		if (ids.length >= WISHLIST_MAX_ITEMS) break;
	}
	return ids;
}

/**
 * Écrit la liste des Product IDs favoris dans le cookie (maxAge complet —
 * expiration glissante) et purge le cookie legacy `wishlist_session`.
 *
 * ⚠️ À appeler uniquement depuis une Server Action ou un Route Handler :
 * `cookies().set()` throw pendant un rendu de Server Component.
 */
export async function writeWishlistCookie(productIds: string[]): Promise<void> {
	const cookieStore = await cookies();

	// La table Wishlist n'existe plus : l'identifiant de session legacy ne
	// pointe vers rien, on le retire à la première mutation.
	if (cookieStore.has(LEGACY_WISHLIST_SESSION_COOKIE_NAME)) {
		cookieStore.delete(LEGACY_WISHLIST_SESSION_COOKIE_NAME);
	}

	const ids = productIds.slice(0, WISHLIST_MAX_ITEMS);

	if (ids.length === 0) {
		cookieStore.delete(WISHLIST_COOKIE_NAME);
		return;
	}

	cookieStore.set(WISHLIST_COOKIE_NAME, JSON.stringify(ids), {
		httpOnly: true, // Pas accessible en JavaScript (protection XSS)
		secure: process.env.NODE_ENV === "production", // HTTPS en production uniquement
		sameSite: "lax", // Protection CSRF
		maxAge: WISHLIST_COOKIE_MAX_AGE,
		path: "/",
	});
}
