// Types - Safe pour client/serveur
export type {
	CompletionStreetAddress,
	CompletionPositionOfInterest,
	CompletionResult,
	CompletionApiResponse,
	SearchAddressParams,
	ValidatedSearchAddressParams,
	SearchAddressResult,
	SearchAddressReturn,
} from "./types";

// Schémas Zod - Client-safe
export { searchAddressSchema, type SearchAddressInput } from "../schemas";

// Actions serveur uniquement
export { searchAddress } from "./autocomplete-address-api";

// Constantes utiles - Client-safe
export {
	BAN_API_BASE_URL,
	SEARCH_ADDRESS_DEFAULT_LIMIT,
	SEARCH_ADDRESS_MAX_LIMIT,
	SEARCH_ADDRESS_DEFAULT_TYPE,
	LOCALISANT_TYPES,
	TERRITORIES,
	LOCALISANT_TYPE_LABELS,
} from "./constants";
