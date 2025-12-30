import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";
import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/shared/constants/address.constants";
import { SHIPPING_COUNTRIES, COUNTRY_ERROR_MESSAGE } from "../constants/countries";

/**
 * Schéma de validation pour une adresse (côté SERVEUR)
 * Applique .trim() sur tous les champs texte et valide le pays
 *
 * Note: Pour la validation côté client (formulaires), utilisez addressFormSchema
 * dans modules/addresses/schemas/address-form.schema.ts
 *
 * @see modules/addresses/schemas/address-form.schema.ts pour le schema formulaire
 */
export const addressSchema = z.object({
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
	address2: z
		.string()
		.max(ADDRESS_CONSTANTS.MAX_ADDRESS_LENGTH, ADDRESS_ERROR_MESSAGES.ADDRESS_TOO_LONG)
		.trim()
		.optional()
		.nullable(),
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
	}).default(ADDRESS_CONSTANTS.DEFAULT_COUNTRY),
	phone: z
		.string()
		.min(1, ADDRESS_ERROR_MESSAGES.INVALID_PHONE)
		.refine(isValidPhoneNumber, { message: ADDRESS_ERROR_MESSAGES.INVALID_PHONE }),
});

export type AddressInput = z.infer<typeof addressSchema>;
