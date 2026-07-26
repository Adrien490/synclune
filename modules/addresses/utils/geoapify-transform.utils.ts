import { type z } from "zod";
import type { SearchAddressResult } from "../types/search-address.types";
import { type geoapifyResultSchema } from "../schemas/geo-response.schema";

/**
 * Raw result from Geoapify Autocomplete API (validated by geo-response.schema)
 */
type GeoapifyResult = z.infer<typeof geoapifyResultSchema>;

/**
 * Transforms a Geoapify result into the unified SearchAddressResult type
 */
export function transformGeoapifyResult(result: GeoapifyResult): SearchAddressResult {
	const postcode = result.postcode ?? "";
	const city = result.city ?? "";
	const street = result.street ?? "";
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: treat empty string as falsy
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
