import { cacheAddressSearch } from "../constants/cache";
import type {
	CompletionApiResponse,
	ValidatedSearchAddressParams,
	SearchAddressReturn,
} from "../types/search-address.types";
import { buildApiUrl } from "../services/address-api.service";
import { transformCompletionResult } from "./address-transform.utils";

/**
 * Récupère les suggestions d'adresses depuis l'API d'autocomplétion de l'IGN
 * Cette fonction est mise en cache pour optimiser les performances
 * Cache: 4h fraîche, 1h revalidation, 30j expiration (profil 'reference')
 */
export async function fetchAddresses(
	params: ValidatedSearchAddressParams
): Promise<SearchAddressReturn> {
	"use cache";
	cacheAddressSearch(params.text);

	try {
		const apiUrl = buildApiUrl(params);

		const response = await fetch(apiUrl, {
			method: "GET",
			headers: {
				"Accept": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`Erreur API BAN: ${response.status} ${response.statusText}`
			);
		}

		const data: CompletionApiResponse = await response.json();

		// Transformer les résultats en format simplifié
		const addresses = data.results.map(transformCompletionResult);

		return {
			addresses,
			query: params.text,
			limit: params.maximumResponses || 5,
		};
	} catch (error) {
		// Log l'erreur pour debugging mais retourne un résultat vide pour ne pas bloquer l'UI
		const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
		console.error(`[ADDRESS-SEARCH] Erreur API BAN: ${errorMessage}`);

		// Retourne un résultat vide plutôt que de throw
		// L'utilisateur peut toujours saisir son adresse manuellement
		return {
			addresses: [],
			query: params.text,
			limit: params.maximumResponses || 5,
		};
	}
}
