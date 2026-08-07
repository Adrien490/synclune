/**
 * Proxy de protection des routes (convention Next.js 16)
 *
 * Vérifie l'existence du cookie de session (pas de validation DB).
 * Les pages/actions protégées DOIVENT toujours revalider la session côté serveur
 * avec requireAuth() / requireAdmin() pour garantir la sécurité.
 *
 * NOTE: CSP is set as a response header in next.config.ts headers(), NOT here.
 * Next.js reads CSP from REQUEST headers to extract nonces (app-render.js line 150).
 * Setting CSP in middleware would put it on the request, causing Next.js to inject nonces
 * that React's streaming runtime scripts ($RC, $RV, $RB) don't receive, breaking server actions.
 */

import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// ===== CONFIGURATION DES ROUTES =====

// Routes publiques (pas d'authentification requise)
const publicRoutes = [
	"/",
	"/produits",
	"/creations",
	"/collections",
	"/mentions-legales",
	// Pages légales
	"/cgv",
	"/confidentialite",
	"/accessibilite",
	"/cookies",
	"/informations-legales",
	"/retractation",
	// Autres pages publiques
	//
	// `/a-propos` et `/aide` n'ont plus de page : les deux sont des redirections
	// permanentes (`next.config.ts`) vers `/` et `/#faq`. Elles restent
	// allowlistées parce que le default-deny ci-dessous les renverrait sinon
	// vers l'accueil SANS l'ancre — et parce qu'un jour où l'ordre de routage
	// changerait, une URL indexée se mettrait à mentir en silence.
	"/a-propos",
	"/aide",
	"/favoris",
	"/opengraph-image",
	"/monitoring",
	"/ingest",
	// Checkout (guest checkout supporté)
	"/paiement",
	// Suivi de commande (AUDIT-BIZ-001) : authentifié par token HMAC dans l'URL,
	// pas par session. C'est désormais le SEUL chemin de consultation d'une
	// commande côté client (retrait de l'espace client 2026-07-31). La page valide
	// le token côté serveur et 404 sinon.
	"/suivi-commande",
];

// Routes d'authentification (redirection si déjà connecté).
// Plus d'`/inscription` : la route a été supprimée et `disableSignUp` ferme
// l'endpoint. La laisser ici l'aurait rendue « publique » au regard du
// default-deny, donc non journalisée si quelqu'un la sonde.
const authRoutes = [
	"/connexion",
	"/mot-de-passe-oublie",
	"/reinitialiser-mot-de-passe",
	"/verifier-email",
	"/renvoyer-verification",
	"/error",
];

// Routes protégées par admin (admin requis)
const adminRoutes = ["/admin"] as const;

// Routes API (toutes gèrent leur propre authentification côté serveur)
// SÉCURITÉ: Ajouter ici toute nouvelle route API. Les routes non listées sont bloquées (default-deny).
// ⚠️ Cette liste est une ALLOWLIST : chaque entrée court-circuite le default-deny.
// Quatre entrées mortes y traînaient (`/api/products`, `/api/collections`,
// `/api/search`, `/api/analytics` — aucun `route.ts` correspondant sur le disque,
// audit 2026-07-31). Une entrée morte n'ouvre rien tant que la route n'existe pas,
// mais elle pré-autorise le jour où quelqu'un crée le fichier, sans que personne ne
// repasse par la décision d'exposition. Ne laisser ici que des routes réelles.
const apiRoutes = [
	"/api/auth",
	"/api/uploadthing",
	"/api/webhooks",
	"/api/cron",
	"/api/health",
	"/api/csp-report",
	"/api/orders",
	"/api/admin",
];

// Helper function pour vérifier les routes (exactes ou sous-routes)
function matchesAnyRoute(pathname: string, routes: readonly string[]): boolean {
	return routes.some((route) => {
		return pathname === route || pathname.startsWith(route + "/");
	});
}

// ===== NORMALISATION D'URL =====

/**
 * Paramètres qui n'ont PAS valeur de filtre sur `/produits` : leur présence
 * n'empêche pas la consolidation `?type=X` → `/produits/X`.
 */
const CATALOG_NON_FILTER_PARAMS = new Set([
	"cursor",
	"direction",
	"perPage",
	"sortBy",
	"search",
	"type",
]);

/** Ceux que la page catégorie sait relire — `perPage` est délibérément abandonné. */
const CATALOG_FORWARDED_PARAMS = ["search", "sortBy", "cursor", "direction"] as const;

/** Un slug de type est `[a-z0-9-]` : tout le reste sort du chemin de redirection. */
const PRODUCT_TYPE_SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * `/produits?type=X` → **308** `/produits/X`, quand `type` est le SEUL filtre.
 *
 * @description
 * Consolidation SEO : la page catégorie est l'URL canonique d'une famille
 * (sitemap, méga-menu, `opengraph-image`), la facette en query ne doit pas la
 * dupliquer.
 *
 * ⚠️ **Ceci vivait dans `app/(shop)/produits/page.tsx`** (`permanentRedirect`),
 * ce qui forçait un `await searchParams` au niveau supérieur de la page — donc
 * un rendu entièrement dynamique, donc un App Shell réduit au squelette pleine
 * page de `loading.tsx`, affiché à CHAQUE navigation de filtre. Une
 * normalisation d'URL n'a pas besoin du moteur de rendu : elle appartient ici.
 *
 * Le garde de slug n'est pas décoratif : la valeur atterrit dans un CHEMIN, et
 * `type=../../admin` y construirait une redirection interne arbitraire. Une
 * valeur non conforme n'est pas redirigée — la page la traite comme un filtre
 * qui ne matche rien.
 */
export function catalogTypeRedirect(nextUrl: NextRequest["nextUrl"]): URL | null {
	if (nextUrl.pathname !== "/produits") return null;

	const types = nextUrl.searchParams.getAll("type");
	const slug = types.length === 1 ? types[0] : undefined;
	if (!slug || !PRODUCT_TYPE_SLUG_PATTERN.test(slug)) return null;

	// Un autre filtre actif (couleur, matière, prix, dispo, promo) : la page reste
	// `/produits`, et son `generateMetadata` la passe en noindex.
	for (const key of nextUrl.searchParams.keys()) {
		if (!CATALOG_NON_FILTER_PARAMS.has(key)) return null;
	}

	const target = new URL(`/produits/${slug}`, nextUrl.origin);
	for (const key of CATALOG_FORWARDED_PARAMS) {
		const value = nextUrl.searchParams.get(key);
		if (value) target.searchParams.set(key, value);
	}
	return target;
}

export async function proxy(request: NextRequest) {
	const { nextUrl } = request;
	const pathname = nextUrl.pathname;

	// ===== 0. NORMALISATION D'URL (avant toute décision d'accès) =====
	const catalogRedirect = catalogTypeRedirect(nextUrl);
	if (catalogRedirect) {
		return NextResponse.redirect(catalogRedirect, 308);
	}

	// AVERTISSEMENT DE SÉCURITÉ:
	// La fonction getSessionCookie() vérifie uniquement l'EXISTENCE du cookie de session,
	// elle ne le VALIDE PAS. C'est volontaire pour éviter les appels DB dans le middleware.
	// Les pages/routes protégées DOIVENT toujours revalider la session côté serveur
	// avec auth.api.getSession() pour garantir la sécurité.
	const sessionCookie = getSessionCookie(request);
	const isLoggedIn = !!sessionCookie;

	// ===== 1. ROUTES API =====
	// Toutes les routes API gèrent leur propre authentification côté serveur
	if (matchesAnyRoute(pathname, apiRoutes)) {
		return NextResponse.next();
	}

	// ===== 2. ROUTES D'AUTHENTIFICATION (AVANT les routes publiques) =====
	// Une session ne peut plus être qu'administratrice : la destination d'un
	// utilisateur déjà connecté qui retombe sur `/connexion` est donc `/admin` et
	// non plus `/commandes` (route supprimée — la redirection y aurait produit un
	// default-deny vers `/`, soit une boucle perçue comme « la connexion ne marche
	// pas »).
	if (matchesAnyRoute(pathname, authRoutes)) {
		if (isLoggedIn) {
			return NextResponse.redirect(new URL("/admin", nextUrl.origin));
		}
		// Utilisateur non connecté -> autoriser l'accès aux pages d'auth
		return NextResponse.next();
	}

	// ===== 3. ROUTES PUBLIQUES =====
	if (matchesAnyRoute(pathname, publicRoutes)) {
		return NextResponse.next();
	}

	// ===== 4. ROUTES PROTÉGÉES ADMIN =====
	// Pré-filtrage UX uniquement, via le cookie cache signé (HMAC, zéro appel DB).
	//
	// ⚠️ FAIL-OPEN ASSUMÉ : si le cookie cache a expiré (TTL
	// `AUTH_SESSION_CONFIG.cookieCache.maxAge`) ou ne porte pas de rôle, la condition
	// ci-dessous est fausse et la requête PASSE. Ce middleware ne sait donc que
	// *refuser* sur un cookie qui se déclare non-admin ; il n'autorise rien.
	//
	// Ce qui autorise réellement, et qui doit exister pour que ce fail-open soit
	// acceptable :
	//   - `app/admin/layout.tsx` → `requireAdminWithUser()` (chargement dur) ;
	//   - CHAQUE `app/admin/**/page.tsx` → `assertAdminPage()`, parce qu'un layout
	//     partagé n'est PAS ré-exécuté lors d'une navigation client entre routes
	//     qui le partagent. Verrouillé par
	//     `app/admin/__tests__/admin-page-auth-guard.regression.test.ts`.
	//   - chaque Server Action / route API → `requireAdmin*()`.
	//
	// Ce commentaire affirmait déjà cette dernière ligne avant l'audit du
	// 2026-07-31, alors qu'aucune des 50 pages ne l'honorait. Ne pas le laisser
	// redevenir une promesse : le garde-fou ci-dessus est ce qui la tient.
	if (matchesAnyRoute(pathname, adminRoutes)) {
		// Pas connecté -> redirection vers login
		if (!isLoggedIn) {
			const redirectUrl = new URL("/connexion", nextUrl.origin);
			redirectUrl.searchParams.set("callbackURL", pathname);
			return NextResponse.redirect(redirectUrl);
		}

		// Vérifier le rôle ADMIN depuis le cookie cache signé
		const sessionData = await getCookieCache(request);
		if (sessionData?.user.role && sessionData.user.role !== "ADMIN") {
			return NextResponse.redirect(new URL("/?error=access-denied", nextUrl.origin));
		}

		return NextResponse.next();
	}

	// ===== 5. PLUS DE ROUTES PROTÉGÉES NON-ADMIN =====
	// `protectedRoutes` portait `/commandes` et `/parametres`, les deux racines de
	// l'espace client, supprimé le 2026-07-31. `/admin` est désormais la seule
	// surface authentifiée, traitée ci-dessus. Les routes client tombent donc dans
	// le default-deny — ce qui est le comportement voulu : elles n'existent plus.

	// ===== 6. DEFAULT-DENY =====
	// SÉCURITÉ: Les routes non définies sont bloquées. Si une nouvelle route est ajoutée,
	// elle DOIT être enregistrée dans les listes ci-dessus.
	console.warn(`[PROXY] Default-deny: blocked unregistered route "${pathname}"`);
	return NextResponse.redirect(new URL("/", nextUrl.origin));
}

export const config = {
	matcher: [
		/*
		 * Matcher pour toutes les routes sauf :
		 * - _next/static (fichiers statiques)
		 * - _next/image (optimisation d'images)
		 * - favicon.ico, robots.txt, sitemap.xml
		 * - fichiers publics (.png, .jpg, .svg, etc.)
		 */
		"/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
	],
};
