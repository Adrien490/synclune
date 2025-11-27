import { cacheAddressSearch } from "../constants/cache";
import type {
	CompletionApiResponse,
	ValidatedSearchAddressParams,
	SearchAddressReturn,
} from "../data/types";
import { buildApiUrl } from "./build-api-url";
import { transformCompletionResult } from "./transform-completion-result";

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
		// Gestion des erreurs
		if (error instanceof Error) {
			throw new Error(`Erreur lors de la recherche d'adresse: ${error.message}`);
		}

		throw new Error("Une erreur inconnue s'est produite lors de la recherche");
	}
}
