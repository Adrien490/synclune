import { getSessionCookie } from "better-auth/cookies";
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
	"/panier",
	"/newsletter",
];

// Routes d'authentification (redirection si déjà connecté)
const authRoutes = [
	"/connexion",
	"/inscription",
	"/mot-de-passe-oublie",
	"/reinitialiser-mot-de-passe",
	"/verifier-email",
	"/renvoyer-verification",
];

// Routes protégées par authentification (utilisateur connecté requis)
const protectedRoutes = [
	"/compte",
	"/commandes",
	"/favoris",
	"/paiement",
];

// Routes protégées par admin (admin requis)
const adminRoutes = ["/admin"];

// Préfixes de routes protégées (toutes les routes sous ce préfixe nécessitent authentification)
const protectedPrefixes = ["/compte", "/commandes", "/paiement"];

// Routes API publiques (ne nécessitent pas d'authentification)
const publicApiRoutes = [
	"/api/auth",
	"/api/uploadthing",
	"/api/webhooks",
	"/api/products", // APIs publiques de produits
	"/api/collections", // APIs publiques de collections
];

// Helper functions pour vérifier les routes
function matchesAnyRoute(pathname: string, routes: string[]): boolean {
	return routes.some((route) => {
		// Match exact ou match de préfixe avec /
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

	// ===== 1. ROUTES API PUBLIQUES =====
	if (matchesAnyRoute(pathname, publicApiRoutes)) {
		return NextResponse.next();
	}

	// ===== 2. ROUTES D'AUTHENTIFICATION (AVANT les routes publiques) =====
	// Rediriger les utilisateurs connectés vers /compte
	if (matchesAnyRoute(pathname, authRoutes)) {
		if (isLoggedIn) {
			// Rediriger vers /compte
			return NextResponse.redirect(new URL("/compte", nextUrl.origin));
		}
		// Utilisateur non connecté -> autoriser l'accès aux pages d'auth
		return NextResponse.next();
	}

	// ===== 3. ROUTES PUBLIQUES =====
	if (matchesAnyRoute(pathname, publicRoutes)) {
		return NextResponse.next();
	}

	// ===== 4. ROUTES PROTÉGÉES ADMIN =====
	// Note: On ne peut pas vérifier le rôle ADMIN ici car on ne valide pas la session complète.
	// La page /admin DOIT valider la session et le rôle côté serveur avec auth.api.getSession()
	if (matchesAnyRoute(pathname, adminRoutes)) {
		// Pas connecté -> redirection vers login
		if (!isLoggedIn) {
			const redirectUrl = new URL("/connexion", nextUrl.origin);
			redirectUrl.searchParams.set("callbackURL", pathname);
			return NextResponse.redirect(redirectUrl);
		}

		// L'utilisateur a un cookie de session -> autoriser l'accès au middleware
		// La page /admin effectuera la vérification du rôle ADMIN côté serveur
		return NextResponse.next();
	}

	// ===== 5. ROUTES PROTÉGÉES UTILISATEUR =====
	// Vérifier les routes exactes et les préfixes
	const isProtectedRoute =
		matchesAnyRoute(pathname, protectedRoutes) ||
		protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

	if (isProtectedRoute) {
		// Pas connecté -> redirection vers login
		if (!isLoggedIn) {
			const redirectUrl = new URL("/connexion", nextUrl.origin);
			redirectUrl.searchParams.set("callbackURL", pathname);
			return NextResponse.redirect(redirectUrl);
		}

		// Utilisateur connecté -> autoriser l'accès
		return NextResponse.next();
	}

	// ===== 6. ROUTES NON DÉFINIES =====
	// Par défaut, autoriser l'accès (comportement permissif)
	// Vous pouvez changer cela pour être plus restrictif si nécessaire
	return NextResponse.next();
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
