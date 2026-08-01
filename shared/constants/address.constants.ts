/**
 * Constantes de validation pour les adresses
 * Partagees entre le schema checkout (`modules/payments/schemas/checkout.schema.ts`)
 * et les schemas commande (`modules/orders/schemas/order.schemas.ts`)
 */

export const ADDRESS_CONSTANTS = {
	MIN_NAME_LENGTH: 2,
	MAX_NAME_LENGTH: 50,
	/**
	 * Nom complet du checkout (champ unique « Full Name », recommandation Baymard),
	 * splitté par `parseFullName` en prénom/nom puis RECOMPOSÉ dans
	 * `Order.customerName` — colonne `VarChar(100)`.
	 *
	 * ⚠️ Vaut 100, et NON `MAX_NAME_LENGTH * 2 + 1`. À 101 (prénom 50 + espace + nom
	 * 50) le refine par partie passait et l'INSERT échouait en `22001` dans la
	 * transaction de création de commande : le client voyait « Une erreur est
	 * survenue » sans savoir quoi corriger. La borne de la colonne recomposée prime
	 * sur la somme des parties.
	 */
	MAX_FULL_NAME_LENGTH: 100,
	MIN_ADDRESS_LENGTH: 5,
	// Aligned with Prisma `Address.address1/address2 VarChar(255)` and
	// `Order.shippingAddress1/billingAddress1 VarChar(255)` snapshot fields.
	MAX_ADDRESS_LENGTH: 255,
	MIN_CITY_LENGTH: 2,
	// Aligned with Prisma `Address.city VarChar(100)` and `Order.shippingCity VarChar(100)`.
	MAX_CITY_LENGTH: 100,
	// Aligned with Prisma `Order.shippingPostalCode/billingPostalCode VarChar(10)`.
	MAX_POSTAL_CODE_LENGTH: 10,
	POSTAL_CODE_REGEX: /^[A-Za-z0-9]{2,4}[\s-]?[A-Za-z0-9]{2,4}$/,
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
	INVALID_PHONE: "Le numéro de téléphone n'est pas valide",
	CREATE_FAILED: "Une erreur est survenue lors de la création de l'adresse",
	UPDATE_FAILED: "Une erreur est survenue lors de la modification de l'adresse",
	DELETE_FAILED: "Une erreur est survenue lors de la suppression de l'adresse",
	SET_DEFAULT_FAILED: "Une erreur est survenue lors de la définition de l'adresse par défaut",
} as const;
