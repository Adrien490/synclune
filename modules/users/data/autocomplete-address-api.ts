"use server";

import { searchAddressSchema } from "../schemas";
import type { SearchAddressParams, SearchAddressReturn } from "../types/address.types";
import { fetchAddresses } from "../utils/fetch-addresses";

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
	// Valider et appliquer les valeurs par défaut
	const validatedParams = searchAddressSchema.parse(params);
	return await fetchAddresses(validatedParams);
}
