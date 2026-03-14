/**
 * Constantes de validation pour les adresses
 * Partagees entre shared/schemas et modules/addresses
 */

export const ADDRESS_CONSTANTS = {
	MIN_NAME_LENGTH: 2,
	MAX_NAME_LENGTH: 50,
	MIN_ADDRESS_LENGTH: 5,
	MAX_ADDRESS_LENGTH: 100,
	MIN_CITY_LENGTH: 2,
	MAX_CITY_LENGTH: 50,
	POSTAL_CODE_REGEX: /^[A-Za-z0-9]{2,4}[\s-]?[A-Za-z0-9]{2,4}$/,
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
	INVALID_POSTAL_CODE: "Le code postal n'est pas valide",
	PHONE_REQUIRED: "Le numéro de téléphone est requis",
	INVALID_PHONE: "Le numéro de téléphone doit être au format français valide",
	CREATE_FAILED: "Une erreur est survenue lors de la création de l'adresse",
	UPDATE_FAILED: "Une erreur est survenue lors de la modification de l'adresse",
	DELETE_FAILED: "Une erreur est survenue lors de la suppression de l'adresse",
	SET_DEFAULT_FAILED: "Une erreur est survenue lors de la définition de l'adresse par défaut",
} as const;
