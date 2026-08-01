/**
 * Types de session minimaux pour shared/
 *
 * Ces types représentent le minimum nécessaire pour les composants partagés
 * qui ont besoin d'information de session (ex: navigation).
 *
 * Pour le type Session complet, importer depuis @/modules/auth/lib/auth
 */

// `MinimalSession` / `MinimalUser` ont disparu avec le paramètre `session` de
// `getMobileNavItems()` : le menu mobile n'a plus d'entrée dépendant de la session
// (retrait de l'espace client 2026-07-31). Seul `NavbarSessionData` subsiste, pour
// le menu d'administration.

/**
 * Données de session restreintes pour la navbar
 * Exclut les champs sensibles (token, ipAddress, userAgent)
 */
export type NavbarSessionData = {
	user: {
		name: string | null;
		email: string;
		image: string | null;
		role: "USER" | "ADMIN";
	};
};
