import type { CompletionResult, SearchAddressResult } from "../data/types";

/**
 * Transforme un résultat de l'API Completion en résultat simplifié
 */
export function transformCompletionResult(
	result: CompletionResult
): SearchAddressResult {
	const zipcode =
		result.zipcode ||
		(result.country === "PositionOfInterest" && result.zipcodes?.[0]) ||
		"";

	return {
		fulltext: result.fulltext,
		street: result.street,
		zipcode,
		city: result.city,
		coordinates: {
			longitude: result.x,
			latitude: result.y,
		},
		classification: result.classification,
		kind: result.kind,
		type: result.country,
		// Alias pour compatibilité avec l'Autocomplete component
		label: result.fulltext,
		postcode: zipcode,
		housenumber: undefined, // Non fourni par l'API Completion
	};
}
