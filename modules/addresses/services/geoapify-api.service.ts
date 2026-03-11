import {
	GEOAPIFY_API_BASE_URL,
	GEOAPIFY_DEFAULT_FORMAT,
	GEOAPIFY_DEFAULT_LIMIT,
} from "../constants/geoapify.constants";

interface GeoapifyUrlParams {
	text: string;
	countryCode: string;
	limit?: number;
}

/**
 * Builds the Geoapify autocomplete API URL with search parameters
 */
export function buildGeoapifyUrl(params: GeoapifyUrlParams): string {
	const apiKey = process.env.GEOAPIFY_API_KEY;
	if (!apiKey) {
		throw new Error("GEOAPIFY_API_KEY is not configured");
	}

	const url = new URL(GEOAPIFY_API_BASE_URL);

	url.searchParams.set("text", params.text);
	url.searchParams.set("filter", `countrycode:${params.countryCode.toLowerCase()}`);
	url.searchParams.set("lang", "fr");
	url.searchParams.set("format", GEOAPIFY_DEFAULT_FORMAT);
	url.searchParams.set("limit", (params.limit ?? GEOAPIFY_DEFAULT_LIMIT).toString());
	url.searchParams.set("apiKey", apiKey);

	return url.toString();
}
