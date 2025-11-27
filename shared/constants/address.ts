/**
 * Constantes du domaine Address
 */

export const ADDRESS_CONSTANTS = {
	MIN_NAME_LENGTH: 2,
	MAX_NAME_LENGTH: 50,
	MIN_ADDRESS_LENGTH: 5,
	MAX_ADDRESS_LENGTH: 100,
	MIN_CITY_LENGTH: 2,
	MAX_CITY_LENGTH: 50,
	POSTAL_CODE_REGEX: /^[0-9]{5}$/,
	PHONE_REGEX: /^(\+33|0)[1-9](\d{2}){4}$/,
	DEFAULT_COUNTRY: "FR",
} as const;

export const ADDRESS_ERROR_MESSAGES = {
	NOT_AUTHENTICATED: "Vous devez être connecté",
	NOT_FOUND: "Adresse non trouvée",
	UNAUTHORIZED: "Vous n'êtes pas autorisé à modifier cette adresse",
	FIRST_NAME_TOO_SHORT: `Le prénom doit contenir au moins ${ADDRESS_CONSTANTS.MIN_NAME_LENGTH} caractères`,
	FIRST_NAME_TOO_LONG: `Le prénom ne peut pas dépasser ${ADDRESS_CONSTANTS.MAX_NAME_LENGTH} caractères`,
	LAST_NAME_TOO_SHORT: `Le nom doit contenir au moins ${ADDRESS_CONSTANTS.MIN_NAME_LENGTH} caractères`,
	LAST_NAME_TOO_LONG: `Le nom ne peut pas dépasser ${ADDRESS_CONSTANTS.MAX_NAME_LENGTH} caractères`,
	ADDRESS_TOO_SHORT: `L'adresse doit contenir au moins ${ADDRESS_CONSTANTS.MIN_ADDRESS_LENGTH} caractères`,
	ADDRESS_TOO_LONG: `L'adresse ne peut pas dépasser ${ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH} caractères`,
	CITY_TOO_SHORT: `La ville doit contenir au moins ${ADDRESS_CONSTANTS.MIN_CITY_LENGTH} caractères`,
	CITY_TOO_LONG: `La ville ne peut pas dépasser ${ADDRESS_CONSTANTS.MAX_CITY_LENGTH} caractères`,
	INVALID_POSTAL_CODE: "Le code postal doit contenir 5 chiffres",
	INVALID_PHONE: "Le numéro de téléphone doit être au format français valide",
	CREATE_FAILED: "Une erreur est survenue lors de la création de l'adresse",
	UPDATE_FAILED: "Une erreur est survenue lors de la modification de l'adresse",
	DELETE_FAILED: "Une erreur est survenue lors de la suppression de l'adresse",
	SET_DEFAULT_FAILED: "Une erreur est survenue lors de la définition de l'adresse par défaut",
} as const;

export const CACHE_TAGS = {
	USER_ADDRESSES: (userId: string) => `addresses:user:${userId}`,
	DEFAULT_ADDRESS: (userId: string) => `address:default:${userId}`,
} as const;
