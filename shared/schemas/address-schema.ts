import { z } from "zod";
import { ADDRESS_CONSTANTS, ADDRESS_ERROR_MESSAGES } from "@/modules/addresses/constants/address.constants";
import { SHIPPING_COUNTRIES, COUNTRY_ERROR_MESSAGE } from "../constants/countries";

/**
 * Schéma de validation pour une adresse
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
		.trim()
		.transform((val) => val.replace(/\s/g, "")) // Remove all spaces for normalization
		.refine(
			(val) => ADDRESS_CONSTANTS.PHONE_REGEX.test(val),
			ADDRESS_ERROR_MESSAGES.INVALID_PHONE
		),
});

export type AddressInput = z.infer<typeof addressSchema>;
