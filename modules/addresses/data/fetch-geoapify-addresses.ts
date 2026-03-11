import { cacheAddressSearch } from "../constants/cache";
import type { SearchAddressReturn } from "../types/search-address.types";
import { buildGeoapifyUrl } from "../services/geoapify-api.service";
import {
	transformGeoapifyResult,
	type GeoapifyApiResponse,
} from "../utils/geoapify-transform.utils";
import { GEOAPIFY_DEFAULT_LIMIT } from "../constants/geoapify.constants";

interface FetchGeoapifyParams {
	text: string;
	countryCode: string;
	limit?: number;
}

/**
 * Fetches address suggestions from Geoapify Autocomplete API
 * Used for EU countries (non-FR). Cached with 'reference' profile.
 */
export async function fetchGeoapifyAddresses(
	params: FetchGeoapifyParams,
): Promise<SearchAddressReturn> {
	"use cache";
	cacheAddressSearch(`geo-${params.countryCode}-${params.text}`);

	const apiUrl = buildGeoapifyUrl(params);

	const response = await fetch(apiUrl, {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
		signal: AbortSignal.timeout(3000),
	});

	if (!response.ok) {
		throw new Error(`Geoapify API error: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as GeoapifyApiResponse;

	const addresses = data.results.map(transformGeoapifyResult);

	return {
		addresses,
		query: params.text,
		limit: params.limit ?? GEOAPIFY_DEFAULT_LIMIT,
	};
}
