"use server";

import { searchAddressSchema } from "../schemas/search-address.schema";
import type { SearchAddressParams, SearchAddressReturn } from "../types/search-address.types";
import { fetchAddresses } from "./fetch-addresses";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADDRESS_LIMITS } from "@/shared/lib/rate-limit-config";

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
export async function searchAddress(
	params: SearchAddressParams
): Promise<SearchAddressReturn> {
	// Rate limiting (user or IP-based)
	const rateCheck = await enforceRateLimitForCurrentUser(ADDRESS_LIMITS.SEARCH);
	if ("error" in rateCheck) {
		return { addresses: [], query: params.text ?? "", limit: 5 };
	}

	// Valider et appliquer les valeurs par défaut
	const validatedParams = searchAddressSchema.parse(params);

	try {
		return await fetchAddresses(validatedParams);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Erreur inconnue";
		console.error(`[ADDRESS-SEARCH] ${message}`);

		return {
			addresses: [],
			query: validatedParams.text,
			limit: validatedParams.maximumResponses,
			error: true,
		};
	}
}
