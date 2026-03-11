"use server";

import { logger } from "@/shared/lib/logger";
import { geoapifySearchSchema, searchAddressSchema } from "../schemas/search-address.schema";
import type { SearchAddressParams, SearchAddressReturn } from "../types/search-address.types";
import { fetchAddresses } from "./fetch-addresses";
import { fetchGeoapifyAddresses } from "./fetch-geoapify-addresses";
import { SEARCH_ADDRESS_DEFAULT_LIMIT } from "../constants/ban-api.constants";
import { GEOAPIFY_DEFAULT_LIMIT } from "../constants/geoapify.constants";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ShippingCountry } from "@/shared/constants/countries";

/**
 * Action serveur pour obtenir des suggestions d'adresses via l'API BAN (Base Adresse Nationale)
 *
 * Cette fonction utilise l'API d'autocomplétion pour :
 * - Fournir des suggestions d'adresses en temps réel
 * - Rechercher des points d'intérêt (POI)
 * - Rechercher des adresses postales
 *
 * @param params - Paramètres de recherche validés
 * @returns Promise<SearchAddressReturn> - Liste des suggestions d'adresses
 *
 * @example
 * ```ts
 * const result = await searchAddress({
 *   text: "73 Avenue de Paris",
 *   maximumResponses: 5,
 * });
 * ```
 */
export async function searchAddress(params: SearchAddressParams): Promise<SearchAddressReturn> {
	// Rate limiting (user or IP-based)
	const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.SEARCH);
	if ("error" in rateCheck) {
		return {
			addresses: [],
			query: params.text,
			limit: params.maximumResponses ?? SEARCH_ADDRESS_DEFAULT_LIMIT,
		};
	}

	// Valider et appliquer les valeurs par défaut
	const validatedParams = searchAddressSchema.parse(params);

	try {
		return await fetchAddresses(validatedParams);
	} catch (error) {
		logger.error("Address search failed", error, { service: "searchAddress" });

		return {
			addresses: [],
			query: validatedParams.text,
			limit: validatedParams.maximumResponses,
			error: true,
		};
	}
}

interface SearchAddressForCheckoutParams {
	text: string;
	country: ShippingCountry;
}

/**
 * Server action for checkout address autocomplete.
 * Routes to IGN (France) or Geoapify (other EU countries) based on country.
 */
export async function searchAddressForCheckout(
	params: SearchAddressForCheckoutParams,
): Promise<SearchAddressReturn> {
	const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.SEARCH);
	if ("error" in rateCheck) {
		return {
			addresses: [],
			query: params.text,
			limit: GEOAPIFY_DEFAULT_LIMIT,
		};
	}

	try {
		if (params.country === "FR") {
			const validatedParams = searchAddressSchema.parse({
				text: params.text,
				maximumResponses: 5,
			});
			return await fetchAddresses(validatedParams);
		}

		const validatedGeoapifyParams = geoapifySearchSchema.parse({
			text: params.text,
			countryCode: params.country,
		});
		return await fetchGeoapifyAddresses(validatedGeoapifyParams);
	} catch (error) {
		logger.error("Checkout address search failed", error, {
			service: "searchAddressForCheckout",
			country: params.country,
		});

		return {
			addresses: [],
			query: params.text,
			limit: GEOAPIFY_DEFAULT_LIMIT,
			error: true,
		};
	}
}
