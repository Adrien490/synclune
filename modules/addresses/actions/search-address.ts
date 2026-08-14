"use server";

import { z } from "zod";
import { logger } from "@/shared/lib/logger";
import { geoapifySearchSchema, searchAddressSchema } from "../schemas/search-address.schema";
import type { SearchAddressReturn } from "../types/search-address.types";
import { fetchAddresses } from "../data/fetch-addresses";
import { fetchGeoapifyAddresses } from "../data/fetch-geoapify-addresses";
import { SEARCH_ADDRESS_DEFAULT_LIMIT } from "../constants/ban-api.constants";
import { GEOAPIFY_DEFAULT_LIMIT } from "../constants/geoapify.constants";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";
import { shippingCountrySchema } from "@/shared/schemas/address.schema";

/**
 * Repli commun aux deux actions : liste vide + drapeau d'erreur.
 *
 * ⚠️ Il ne lit JAMAIS l'argument brut. Les deux actions le construisaient à partir
 * de `params.text` / `params.maximumResponses` — y compris **dans le `catch`**.
 * Sur un appel RPC direct (`searchAddress(null)`), le schéma levait sa ZodError,
 * puis le `catch` levait un `TypeError` en déréférençant `null` : le fallback
 * documenté par ce fichier ne s'exécutait jamais, et l'action rendait une erreur
 * non rattrapée au lieu d'une liste vide.
 */
function emptyResult(query: string, limit: number): SearchAddressReturn {
	return { addresses: [], query, limit, error: true };
}

/**
 * Action serveur pour obtenir des suggestions d'adresses via l'API BAN (Base Adresse Nationale)
 *
 * Cette fonction utilise l'API d'autocomplétion pour :
 * - Fournir des suggestions d'adresses en temps réel
 * - Rechercher des points d'intérêt (POI)
 * - Rechercher des adresses postales
 *
 * ⚠️ `params: unknown` et non `SearchAddressParams` : `"use server"` publie un
 * endpoint RPC, le type du paramètre est effacé à l'exécution. Le parse en tête
 * est la seule garantie — et il précède toute lecture de l'argument.
 *
 * @param params - Payload brut, parsé par `searchAddressSchema`
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
export async function searchAddress(params: unknown): Promise<SearchAddressReturn> {
	// Parse EN TÊTE : tout ce qui suit (y compris les replis) travaille sur la
	// valeur validée, jamais sur l'argument brut.
	const parsed = searchAddressSchema.safeParse(params);
	if (!parsed.success) {
		return emptyResult("", SEARCH_ADDRESS_DEFAULT_LIMIT);
	}
	const validatedParams = parsed.data;

	// Rate limiting (user or IP-based)
	const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.SEARCH);
	if ("error" in rateCheck) {
		return emptyResult(validatedParams.text, validatedParams.maximumResponses);
	}

	try {
		return await fetchAddresses(validatedParams);
	} catch (error) {
		logger.error("Address search failed", error, { service: "searchAddress" });
		return emptyResult(validatedParams.text, validatedParams.maximumResponses);
	}
}

/**
 * ⚠️ `country` est borné par `shippingCountrySchema`, pas par le `length(2)` de
 * `geoapifySearchSchema` : ce dernier laissait passer n'importe quel code ISO à
 * deux lettres vers Geoapify — une API facturée à l'appel, atteinte ici par un
 * endpoint public. La boutique ne livre que les 27 + Monaco.
 */
const searchAddressForCheckoutSchema = z.object({
	text: z.string().min(1).max(200),
	country: shippingCountrySchema,
});

const CHECKOUT_SEARCH_MAX_RESPONSES = 5;

/**
 * Server action for checkout address autocomplete.
 * Routes to IGN (France) or Geoapify (other EU countries) based on country.
 *
 * Même discipline que `searchAddress` : `unknown` + parse en tête, replis bâtis
 * sur la valeur parsée.
 */
export async function searchAddressForCheckout(params: unknown): Promise<SearchAddressReturn> {
	const parsed = searchAddressForCheckoutSchema.safeParse(params);
	if (!parsed.success) {
		return emptyResult("", GEOAPIFY_DEFAULT_LIMIT);
	}
	const { text, country } = parsed.data;

	const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.SEARCH);
	if ("error" in rateCheck) {
		return emptyResult(text, GEOAPIFY_DEFAULT_LIMIT);
	}

	try {
		if (country === "FR") {
			return await fetchAddresses(
				searchAddressSchema.parse({ text, maximumResponses: CHECKOUT_SEARCH_MAX_RESPONSES }),
			);
		}

		return await fetchGeoapifyAddresses(geoapifySearchSchema.parse({ text, countryCode: country }));
	} catch (error) {
		logger.error("Checkout address search failed", error, {
			service: "searchAddressForCheckout",
			country,
		});
		return emptyResult(text, GEOAPIFY_DEFAULT_LIMIT);
	}
}
