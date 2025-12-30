import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";
import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";
import { SHIPPING_COUNTRIES, COUNTRY_ERROR_MESSAGE } from "@/shared/constants/countries";

/**
 * Schema de validation pour le formulaire d'adresse (côté CLIENT)
 * Aligné avec addressSchema (shared/schemas/address-schema.ts) pour coherence client/serveur
 *
 * @see shared/schemas/address-schema.ts pour le schema serveur
 */
export const addressFormSchema = z.object({
	firstName: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.FIRST_NAME_TOO_LONG)
		.trim(),

	lastName: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.LAST_NAME_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_NAME_LENGTH, ADDRESS_ERROR_MESSAGES.LAST_NAME_TOO_LONG)
		.trim(),

	address1: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_ADDRESS_LENGTH, ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH, ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG)
		.trim(),

	address2: z.string().trim().optional(),

	postalCode: z
		.string()
		.regex(ADDRESS_CONSTANTS.POSTAL_CODE_REGEX, ADDRESS_ERROR_MESSAGES.INVALID_POSTAL_CODE)
		.trim(),

	city: z
		.string()
		.min(ADDRESS_CONSTANTS.MIN_CITY_LENGTH, ADDRESS_ERROR_MESSAGES.CITY_TOO_SHORT)
		.max(ADDRESS_CONSTANTS.MAX_CITY_LENGTH, ADDRESS_ERROR_MESSAGES.CITY_TOO_LONG)
		.trim(),

	country: z.enum(SHIPPING_COUNTRIES, {
		message: COUNTRY_ERROR_MESSAGE,
	}),

	phone: z
		.string()
		.min(1, ADDRESS_ERROR_MESSAGES.INVALID_PHONE)
		.refine(isValidPhoneNumber, { message: ADDRESS_ERROR_MESSAGES.INVALID_PHONE }),
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
