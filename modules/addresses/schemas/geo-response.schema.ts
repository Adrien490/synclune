import { z } from "zod";

/**
 * C1 (audit validation Zod 2026-07-09) — réponses des API géo tierces
 * (BAN/IGN + Geoapify), auparavant castées `as` sans validation runtime.
 *
 * `looseObject` justifié (même rationale que stripe-metadata.schema.ts) :
 * sacs de champs fournisseur — seuls les champs consommés par les transforms
 * sont validés, le reste passe tel quel. Le parse est fail-soft PAR RÉSULTAT
 * via `parseGeoResults` : un item au shape inattendu (drift fournisseur) est
 * filtré et l'autocomplete dégrade au lieu de crasher.
 */

const banStreetAddressSchema = z.looseObject({
	country: z.literal("StreetAddress"),
	city: z.string(),
	x: z.number(), // longitude
	y: z.number(), // latitude
	zipcode: z.string(),
	street: z.string(),
	classification: z.number(),
	kind: z.string(),
	fulltext: z.string(),
});

const banPositionOfInterestSchema = z.looseObject({
	country: z.literal("PositionOfInterest"),
	city: z.string(),
	x: z.number(), // longitude
	y: z.number(), // latitude
	zipcode: z.string().optional(),
	zipcodes: z.array(z.string()),
	street: z.string(),
	classification: z.number(),
	kind: z.string(),
	fulltext: z.string(),
});

export const banResultSchema = z.discriminatedUnion("country", [
	banStreetAddressSchema,
	banPositionOfInterestSchema,
]);

export const geoapifyResultSchema = z.looseObject({
	formatted: z.string(),
	address_line1: z.string().optional(),
	street: z.string().optional(),
	housenumber: z.string().optional(),
	postcode: z.string().optional(),
	city: z.string().optional(),
	lat: z.number(), // latitude
	lon: z.number(), // longitude
	rank: z.looseObject({ confidence: z.number() }).optional(),
	result_type: z.string().optional(),
});

const geoEnvelopeSchema = z.looseObject({
	results: z.array(z.unknown()),
});

/**
 * Valide une réponse géo brute (`unknown`) : enveloppe `{ results: [...] }`
 * absente/malformée → `[]`, items invalides filtrés un à un.
 */
export function parseGeoResults<S extends z.ZodType>(data: unknown, resultSchema: S): z.infer<S>[] {
	const envelope = geoEnvelopeSchema.safeParse(data);
	if (!envelope.success) return [];

	return envelope.data.results.flatMap((item) => {
		const parsed = resultSchema.safeParse(item);
		return parsed.success ? [parsed.data as z.infer<S>] : [];
	});
}
