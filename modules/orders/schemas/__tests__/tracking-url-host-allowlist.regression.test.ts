/**
 * @regression tracking-url-host-allowlist
 *
 * ORD-SEC-009 — un `trackingUrl` dont l'hôte n'appartient pas aux domaines des
 * transporteurs connus (dérivés de `CARRIER_TRACKING_URLS`) n'est accepté
 * qu'avec `carrier === "autre"`, échappatoire explicite.
 *
 * Défaut d'origine (différé de l'audit « Livraison et tracking » 2026-07-26,
 * fermé le 2026-08-01) : le schéma n'exigeait que `http(s)`. Une URL arbitraire
 * saisie dans l'admin partait telle quelle au client — CTA « Suivre mon colis »
 * de l'email d'expédition et lien de la page publique `/suivi-commande` —
 * cautionnée par le domaine Synclune : redirection ouverte à portée admin
 * (compte compromis inclus). Le même refus attrape au passage la
 * désynchronisation carrier/URL (carrier « colissimo » avec une URL UPS reste
 * accepté — les deux sont des sites de transporteurs — mais une URL hors liste
 * ne peut plus se glisser sous un transporteur connu).
 *
 * Couvre aussi la borne `.max(2048)` (alignée sur `Order.trackingUrl
 * VarChar(2048)`, déclarée dans le contrat zod-prisma-length-parity) et la
 * normalisation `"" | null → undefined` du champ `carrier` (le picker n'a plus
 * de valeur par défaut : le hidden Radix poste `""` tant que rien n'est choisi).
 */

import { describe, expect, it } from "vitest";
import { markAsShippedSchema, updateTrackingSchema } from "../order.schemas";
import { TRACKING_URL_MAX_LENGTH } from "../../constants/order.constants";

const VALID_CUID = "abcdefghijklmnopqrstuvwx";
const TRACKING_NUMBER = "1Z999AA10123456784";

const SCHEMAS = [
	["markAsShippedSchema", markAsShippedSchema] as const,
	["updateTrackingSchema", updateTrackingSchema] as const,
];

describe.each(SCHEMAS)("%s — allowlist d'hôtes trackingUrl", (_name, schema) => {
	function parse(input: { trackingUrl?: unknown; carrier?: unknown }) {
		return schema.safeParse({
			id: VALID_CUID,
			trackingNumber: TRACKING_NUMBER,
			sendEmail: "true",
			...input,
		});
	}

	it("accepte l'URL d'un transporteur connu avec son carrier", () => {
		const result = parse({
			carrier: "colissimo",
			trackingUrl: "https://www.laposte.fr/outils/suivre-vos-envois?code=8N1",
		});

		expect(result.success).toBe(true);
	});

	it("accepte un sous-domaine d'un apex connu (trace.dpd.fr)", () => {
		const result = parse({
			carrier: "dpd",
			trackingUrl: "https://trace.dpd.fr/fr/trace/01234567890123",
		});

		expect(result.success).toBe(true);
	});

	it("refuse un hôte hors liste sous un transporteur connu", () => {
		const result = parse({
			carrier: "colissimo",
			trackingUrl: "https://evil.example/phishing",
		});

		expect(result.success).toBe(false);
		expect(result.error?.issues.some((issue) => issue.path.join(".") === "trackingUrl")).toBe(true);
	});

	it("refuse le préfixe piégé (evillaposte.fr ne matche pas laposte.fr)", () => {
		const result = parse({
			carrier: "colissimo",
			trackingUrl: "https://evillaposte.fr/suivi",
		});

		expect(result.success).toBe(false);
	});

	it("refuse un hôte hors liste quand le carrier n'est pas renseigné", () => {
		const result = parse({
			carrier: "",
			trackingUrl: "https://evil.example/phishing",
		});

		expect(result.success).toBe(false);
	});

	it("accepte un hôte hors liste UNIQUEMENT avec carrier « autre » (échappatoire explicite)", () => {
		const result = parse({
			carrier: "autre",
			trackingUrl: "https://coursier-local.example/suivi/123",
		});

		expect(result.success).toBe(true);
	});

	it(`refuse une URL au-delà de ${TRACKING_URL_MAX_LENGTH} caractères, même via l'échappatoire`, () => {
		const longUrl = `https://coursier-local.example/${"a".repeat(TRACKING_URL_MAX_LENGTH)}`;
		const result = parse({ carrier: "autre", trackingUrl: longUrl });

		expect(result.success).toBe(false);
	});

	it('normalise carrier "" et null en undefined (picker sans sélection, champ absent)', () => {
		for (const carrier of ["", null]) {
			const result = parse({ carrier, trackingUrl: "" });

			expect(result.success).toBe(true);
			expect(result.data?.carrier).toBeUndefined();
		}
	});
});
