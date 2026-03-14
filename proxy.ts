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
	"/personnalisation",
	"/mentions-legales",
	"/newsletter",
	// Pages légales
	"/cgv",
	"/confidentialite",
	"/accessibilite",
	"/cookies",
	"/informations-legales",
	"/retractation",
	// Autres pages publiques
	"/a-propos",
	"/favoris",
	"/opengraph-image",
	"/~offline",
	"/monitoring",
	"/ingest",
	"/serwist",
	// Checkout (guest checkout supporté)
	"/paiement",
];

// Routes d'authentification (redirection si déjà connecté)
const authRoutes = [
	"/connexion",
	"/inscription",
	"/mot-de-passe-oublie",
	"/reinitialiser-mot-de-passe",
	"/verifier-email",
	"/renvoyer-verification",
	"/error",
];

// Routes protégées par authentification (utilisateur connecté requis)
// Note: Couvre les routes exactes ET leurs sous-routes (ex: /compte/*)
const protectedRoutes = ["/commandes", "/adresses", "/parametres"] as const;

// Routes protégées par admin (admin requis)
const adminRoutes = ["/admin"] as const;

// Routes API (toutes gèrent leur propre authentification côté serveur)
// SÉCURITÉ: Ajouter ici toute nouvelle route API. Les routes non listées sont bloquées (default-deny).
const apiRoutes = [
	"/api/auth",
	"/api/uploadthing",
	"/api/webhooks",
	"/api/products",
	"/api/collections",
	"/api/cron",
	"/api/health",
	"/api/csp-report",
	"/api/newsletter",
	"/api/orders",
	"/api/admin",
	"/api/search",
	"/api/analytics",
];

// Helper function pour vérifier les routes (exactes ou sous-routes)
function matchesAnyRoute(pathname: string, routes: readonly string[]): boolean {
	return routes.some((route) => {
		return pathname === route || pathname.startsWith(route + "/");
	});
}

export async function proxy(request: NextRequest) {
	const { nextUrl } = request;
	const pathname = nextUrl.pathname;

	// AVERTISSEMENT DE SÉCURITÉ:
	// La fonction getSessionCookie() vérifie uniquement l'EXISTENCE du cookie de session,
	// elle ne le VALIDE PAS. C'est volontaire pour éviter les appels DB dans le middleware.
	// Les pages/routes protégées DOIVENT toujours revalider la session côté serveur
	// avec auth.api.getSession() pour garantir la sécurité.
	const sessionCookie = getSessionCookie(request);
	const isLoggedIn = !!sessionCookie;

	// ===== 0. REDIRECT /compte → /commandes =====
	if (pathname === "/compte" || pathname.startsWith("/compte/")) {
		return NextResponse.redirect(new URL("/commandes", nextUrl.origin));
	}

	// ===== 1. ROUTES API =====
	// Toutes les routes API gèrent leur propre authentification côté serveur
	if (matchesAnyRoute(pathname, apiRoutes)) {
		return NextResponse.next();
	}

	// ===== 2. ROUTES D'AUTHENTIFICATION (AVANT les routes publiques) =====
	// Rediriger les utilisateurs connectés vers /commandes
	if (matchesAnyRoute(pathname, authRoutes)) {
		if (isLoggedIn) {
			return NextResponse.redirect(new URL("/commandes", nextUrl.origin));
		}
		// Utilisateur non connecté -> autoriser l'accès aux pages d'auth
		return NextResponse.next();
	}

	// ===== 3. ROUTES PUBLIQUES =====
	if (matchesAnyRoute(pathname, publicRoutes)) {
		return NextResponse.next();
	}

	// ===== 4. ROUTES PROTÉGÉES ADMIN =====
	// Vérification du rôle ADMIN via le cookie cache signé (HMAC, pas de DB call).
	// Si le cookie cache a expiré (TTL 5 min), getCookieCache retourne null → redirection (sécurité par défaut).
	// Les pages/actions admin DOIVENT toujours utiliser requireAdmin() pour la validation serveur définitive.
	if (matchesAnyRoute(pathname, adminRoutes)) {
		// Pas connecté -> redirection vers login
		if (!isLoggedIn) {
			const redirectUrl = new URL("/connexion", nextUrl.origin);
			redirectUrl.searchParams.set("callbackURL", pathname);
			return NextResponse.redirect(redirectUrl);
		}

		// Vérifier le rôle ADMIN depuis le cookie cache signé
		const sessionData = await getCookieCache(request);
		if (sessionData?.user.role !== "ADMIN") {
			return NextResponse.redirect(new URL("/?error=access-denied", nextUrl.origin));
		}

		return NextResponse.next();
	}

	// ===== 5. ROUTES PROTÉGÉES UTILISATEUR =====
	// matchesAnyRoute vérifie les routes exactes ET les sous-routes
	if (matchesAnyRoute(pathname, protectedRoutes)) {
		// Pas connecté -> redirection vers login
		if (!isLoggedIn) {
			const redirectUrl = new URL("/connexion", nextUrl.origin);
			redirectUrl.searchParams.set("callbackURL", pathname);
			return NextResponse.redirect(redirectUrl);
		}

		// Utilisateur connecté -> autoriser l'accès
		return NextResponse.next();
	}

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
