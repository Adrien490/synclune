import { BAN_API_BASE_URL } from "../constants/ban-api.constants";
import type { ValidatedSearchAddressParams } from "../types/search-address.types";

/**
 * Construit l'URL de l'API avec les paramètres de recherche
 */
export function buildApiUrl(params: ValidatedSearchAddressParams): string {
	const url = new URL(BAN_API_BASE_URL);

	// Paramètre text (requis)
	url.searchParams.set("text", params.text);

	// Paramètres optionnels
	if (params.terr !== undefined) {
		url.searchParams.set("terr", params.terr);
	}

	if (params.poiType !== undefined) {
		url.searchParams.set("poiType", params.poiType);
	}

	if (params.lonlat !== undefined) {
		url.searchParams.set("lonlat", params.lonlat);
	}

	if (params.type !== undefined) {
		url.searchParams.set("type", params.type);
	}

	if (params.maximumResponses !== undefined) {
		url.searchParams.set(
			"maximumResponses",
			params.maximumResponses.toString()
		);
	}

	if (params.bbox !== undefined) {
		url.searchParams.set("bbox", params.bbox);
	}

	return url.toString();
}
