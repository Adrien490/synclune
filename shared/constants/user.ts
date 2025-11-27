/**
 * Constantes du domaine User
 */

export const USER_CONSTANTS = {
	MAX_NAME_LENGTH: 100,
	MIN_NAME_LENGTH: 2,
	MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 Mo
	ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
} as const;

export const USER_ERROR_MESSAGES = {
	NOT_AUTHENTICATED: "Vous devez être connecté",
	EMAIL_ALREADY_EXISTS: "Cette adresse email est déjà utilisée",
	INVALID_EMAIL: "L'adresse email n'est pas valide",
	NAME_TOO_SHORT: `Le nom doit contenir au moins ${USER_CONSTANTS.MIN_NAME_LENGTH} caractères`,
	NAME_TOO_LONG: `Le nom ne peut pas dépasser ${USER_CONSTANTS.MAX_NAME_LENGTH} caractères`,
	IMAGE_TOO_LARGE: `L'image ne peut pas dépasser ${USER_CONSTANTS.MAX_IMAGE_SIZE / 1024 / 1024} Mo`,
	IMAGE_INVALID_TYPE: "Format d'image non supporté",
	UPDATE_FAILED: "Une erreur est survenue lors de la mise à jour",
} as const;

export const CACHE_TAGS = {
	USER: (userId: string) => `user:${userId}`,
	CURRENT_USER: "current-user",
} as const;
