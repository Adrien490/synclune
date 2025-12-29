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
	POSTAL_CODE_REGEX: /^[0-9]{5}$/,
	PHONE_REGEX: /^(\+33|0)[1-9](\d{2}){4}$/,
	DEFAULT_COUNTRY: "FR",
} as const;

export const ADDRESS_ERROR_MESSAGES = {
	NOT_AUTHENTICATED: "Vous devez etre connecte",
	NOT_FOUND: "Adresse non trouvee",
	UNAUTHORIZED: "Vous n'etes pas autorise a modifier cette adresse",
	FIRST_NAME_TOO_SHORT: `Le prenom doit contenir au moins ${ADDRESS_CONSTANTS.MIN_NAME_LENGTH} caracteres`,
	FIRST_NAME_TOO_LONG: `Le prenom ne peut pas depasser ${ADDRESS_CONSTANTS.MAX_NAME_LENGTH} caracteres`,
	LAST_NAME_TOO_SHORT: `Le nom doit contenir au moins ${ADDRESS_CONSTANTS.MIN_NAME_LENGTH} caracteres`,
	LAST_NAME_TOO_LONG: `Le nom ne peut pas depasser ${ADDRESS_CONSTANTS.MAX_NAME_LENGTH} caracteres`,
	ADDRESS_TOO_SHORT: `L'adresse doit contenir au moins ${ADDRESS_CONSTANTS.MIN_ADDRESS_LENGTH} caracteres`,
	ADDRESS_TOO_LONG: `L'adresse ne peut pas depasser ${ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH} caracteres`,
	CITY_TOO_SHORT: `La ville doit contenir au moins ${ADDRESS_CONSTANTS.MIN_CITY_LENGTH} caracteres`,
	CITY_TOO_LONG: `La ville ne peut pas depasser ${ADDRESS_CONSTANTS.MAX_CITY_LENGTH} caracteres`,
	INVALID_POSTAL_CODE: "Le code postal doit contenir 5 chiffres",
	INVALID_PHONE: "Le numero de telephone doit etre au format francais valide",
	CREATE_FAILED: "Une erreur est survenue lors de la creation de l'adresse",
	UPDATE_FAILED: "Une erreur est survenue lors de la modification de l'adresse",
	DELETE_FAILED: "Une erreur est survenue lors de la suppression de l'adresse",
	SET_DEFAULT_FAILED: "Une erreur est survenue lors de la definition de l'adresse par defaut",
} as const;
