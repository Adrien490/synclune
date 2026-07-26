/**
 * @regression tracking-url-empty-string
 *
 * Un champ `trackingUrl` vide doit arriver aux actions en `undefined`, jamais
 * en `""`.
 *
 * Défaut d'origine (audit « Livraison et tracking » 2026-07-26, P0-4) :
 * `markAsShipped` et `updateTracking` génèrent l'URL serveur via
 *
 *     validated.data.trackingUrl ?? getTrackingUrl(carrier, trackingNumber)
 *
 * mais `??` ne couvre que `null | undefined`. Or les deux formulaires rendent
 * TOUJOURS un `<input type="hidden" name="trackingUrl">`, `safeFormGet` retourne
 * `""` pour un champ vide (jamais `null`), et l'ancien schéma acceptait
 * explicitement `.or(z.literal(""))`. Le fallback serveur était donc
 * inatteignable depuis l'UI — `getTrackingUrl` n'y était joignable que par les
 * tests unitaires — et `""` finissait persisté là où les consommateurs (et
 * `revertToProcessing`, qui écrit `null`) attendent `null` : deux sentinelles
 * de « pas d'URL » coexistaient en base.
 *
 * Combiné au défaut du picker de transporteur (P0-3, qui laissait le champ vide
 * pour GLS/DHL/UPS/FedEx/Relais Colis), le résultat visible était un email
 * d'expédition sans aucun lien de suivi.
 *
 * ⚠️ Les suites `mark-as-shipped.test.ts` / `update-tracking.test.ts` stubbent
 * `safeParse`, donc ne peuvent PAS voir ce défaut : elles injectent
 * `trackingUrl: undefined` directement. Ce test utilise le VRAI schéma.
 */

import { describe, expect, it } from "vitest";
import { markAsShippedSchema, updateTrackingSchema } from "../order.schemas";

const VALID_CUID = "abcdefghijklmnopqrstuvwx";
const TRACKING_NUMBER = "1Z999AA10123456784";

const SCHEMAS = [
	["markAsShippedSchema", markAsShippedSchema] as const,
	["updateTrackingSchema", updateTrackingSchema] as const,
];

describe.each(SCHEMAS)("%s — trackingUrl", (_name, schema) => {
	function parse(trackingUrl: unknown) {
		return schema.safeParse({
			id: VALID_CUID,
			trackingNumber: TRACKING_NUMBER,
			trackingUrl,
			carrier: "ups",
			sendEmail: "true",
		});
	}

	it('normalise "" en undefined (rend le fallback `??` atteignable)', () => {
		const result = parse("");

		expect(result.success).toBe(true);
		// `toBeUndefined` et non `toBeFalsy` : `""` est falsy mais ne déclenche PAS
		// le `??` des actions — c'est toute la différence.
		expect(result.data?.trackingUrl).toBeUndefined();
	});

	it("laisse passer une URL https valide", () => {
		const result = parse("https://www.ups.com/track?tracknum=1Z999");

		expect(result.success).toBe(true);
		expect(result.data?.trackingUrl).toBe("https://www.ups.com/track?tracknum=1Z999");
	});

	it("accepte un champ absent", () => {
		const result = parse(undefined);

		expect(result.success).toBe(true);
		expect(result.data?.trackingUrl).toBeUndefined();
	});

	// La garde anti-XSS d'origine (ORD-SEC-008) doit survivre à la normalisation :
	// `z.url()` seul accepterait `javascript:alert(1)`, rendu dans 2 emails
	// transactionnels et le panneau admin.
	it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox"])(
		"refuse le schéma dangereux %s",
		(dangerous) => {
			expect(parse(dangerous).success).toBe(false);
		},
	);

	it("refuse une chaîne non-URL", () => {
		expect(parse("pas-une-url").success).toBe(false);
	});
});
