import type { SearchAddressResult } from "../types/search-address.types";

/**
 * Raw result from Geoapify Autocomplete API
 */
interface GeoapifyResult {
	formatted: string;
	address_line1?: string;
	street?: string;
	housenumber?: string;
	postcode?: string;
	city?: string;
	lat: number;
	lon: number;
	rank?: {
		confidence: number;
	};
	result_type?: string;
}

/**
 * Geoapify autocomplete API response
 */
export interface GeoapifyApiResponse {
	results: GeoapifyResult[];
}

/**
 * Transforms a Geoapify result into the unified SearchAddressResult type
 */
export function transformGeoapifyResult(result: GeoapifyResult): SearchAddressResult {
	const postcode = result.postcode ?? "";
	const city = result.city ?? "";
	const street = result.street ?? "";
	const label = result.address_line1 || result.formatted;

	return {
		fulltext: label,
		street,
		zipcode: postcode,
		city,
		coordinates: {
			longitude: result.lon,
			latitude: result.lat,
		},
		classification: result.rank?.confidence ?? 0,
		kind: result.result_type ?? "street",
		type: "StreetAddress",
		label,
		postcode,
		housenumber: result.housenumber,
	};
}
