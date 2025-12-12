import { z } from "zod";
import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";

/**
 * Schema de validation pour le formulaire d'adresse
 * Utilisé avec TanStack Form pour la validation côté client
 */
export const addressFormSchema = z.object({
	firstName: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_LONG),

	lastName: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.LAST_NAME_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.LAST_NAME_TOO_LONG),

	address1: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_ADDRESS_LENGTH, ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH, ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG),

	address2: z.string().optional(),

	postalCode: z
		.string()
		.regex(ADDRESS_CONSTANTS.POSTAL_CODE_REGEX, ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE),

	city: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_CITY_LENGTH, ADDRESS_ERROR_MESSAGES.CITY_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_CITY_LENGTH, ADDRESS_ERROR_MESSAGES.CITY_TOO_LONG),

	country: z.string(),

	phone: z
		.string()
		.transform((val) => val.replace(/\s/g, "")) // Normalise en supprimant les espaces
		.pipe(
			z.string().regex(ADDRESS_CONSTANTS.PHONE_REGEX, ADDRESS_ERROR_MESSAGES.INVALID_PHONE)
		),
});

/**
 * Type inféré du schema de formulaire d'adresse
 */
export type AddressFormInput = z.infer<typeof addressFormSchema>;

/**
 * Valeurs par défaut pour le formulaire d'adresse
 */
export const addressFormDefaultValues: AddressFormInput = {
	firstName: "",
	lastName: "",
	address1: "",
	address2: "",
	postalCode: "",
	city: "",
	country: ADDRESS_CONSTANTS.DEFAULT_COUNTRY,
	phone: "",
};
