/**
 * Types de session minimaux pour shared/
 *
 * Ces types représentent le minimum nécessaire pour les composants partagés
 * qui ont besoin d'information de session (ex: navigation).
 *
 * Pour le type Session complet, importer depuis @/modules/auth/lib/auth
 */

/**
 * Représentation minimale d'un utilisateur pour la navigation
 */
export type MinimalUser = {
	id: string;
	email: string;
	name: string | null;
};

/**
 * Représentation minimale de session pour les composants partagés
 * Compatible avec le type Session de Better Auth
 */
export type MinimalSession = {
	user: MinimalUser;
	session: {
		id: string;
		userId: string;
	};
};
