/**
 * @regression rate-limit-preset-naming-2026-07-31
 *
 * Verrouille l'invariant né de la correction de KI-004 : la clé du compteur est
 * `ratelimit:<name>:<identifier>`, donc **deux presets qui portent le même `name`
 * partagent un budget**, et un `name` manquant les remettrait tous en commun.
 *
 * Le défaut d'origine : la clé ne portait que l'identifiant. La limite effective
 * de chaque action était alors le MINIMUM des limites en présence, avec la fenêtre
 * de la première entrée créée — 5 consultations de fiche produit
 * (`PRODUCT_COOKIE_ACTION`, 30/min) suffisaient à faire répondre 429 au formulaire
 * de connexion (`AUTH_LOGIN`, 5/15 min), verrouillant l'unique compte
 * d'administration sur des identifiants pourtant valides.
 *
 * `tsc` impose déjà la PRÉSENCE du champ (`name: string` requis). Ce test couvre
 * ce que le type ne peut pas voir : chaîne vide, casse incohérente, et surtout
 * collision de noms entre deux presets distincts.
 *
 * @see docs/KNOWN-ISSUES.md — KI-004
 */

import { describe, it, expect } from "vitest";
import type { RateLimitConfig } from "@/shared/types/rate-limit.types";
import * as rateLimitConfig from "@/shared/lib/rate-limit-config";
import { UPLOAD_LIMITS, MEDIA_LIMITS } from "@/modules/media/constants/upload-limits";
import { SEARCH_RATE_LIMITS } from "@/modules/products/constants/search.constants";

// ============================================================================
// COLLECTE
// ============================================================================

function isConfigShape(value: unknown): value is RateLimitConfig {
	return (
		typeof value === "object" &&
		value !== null &&
		"name" in value &&
		("limit" in value || "windowMs" in value)
	);
}

/**
 * Parcourt les modules de presets et collecte les configs, **dédupliquées par
 * identité d'objet**.
 *
 * ⚠️ La déduplication par référence n'est pas cosmétique : `WISHLIST_LIMITS.ADD`,
 * `.REMOVE` et `.TOGGLE` sont littéralement le MÊME objet (partage voulu, verrouillé
 * par `.toBe` dans `rate-limit-config.test.ts`). Une assertion naïve « tous les noms
 * collectés sont uniques » échouerait donc dès le premier jour, sur un partage
 * légitime — et serait désactivée dans la foulée.
 */
function collectPresets(): Map<RateLimitConfig, string[]> {
	const found = new Map<RateLimitConfig, string[]>();

	const visit = (value: unknown, path: string, depth: number): void => {
		if (depth > 2 || typeof value !== "object" || value === null) return;

		if (isConfigShape(value)) {
			found.set(value, [...(found.get(value) ?? []), path]);
			return;
		}

		for (const [key, child] of Object.entries(value)) {
			visit(child, `${path}.${key}`, depth + 1);
		}
	};

	for (const [key, value] of Object.entries(rateLimitConfig)) {
		visit(value, key, 0);
	}
	visit(UPLOAD_LIMITS, "UPLOAD_LIMITS", 0);
	visit(MEDIA_LIMITS, "MEDIA_LIMITS", 0);
	visit(SEARCH_RATE_LIMITS, "SEARCH_RATE_LIMITS", 0);

	return found;
}

const PRESETS = collectPresets();

// ============================================================================
// TESTS
// ============================================================================

describe("presets de rate limit — nommage", () => {
	// Garde-fou du garde-fou : si la collecte casse (renommage de module, refactor
	// d'export), toutes les assertions ci-dessous passeraient sur un ensemble vide.
	// Plancher abaissé délibérément au Lot 4 (SIMPLIFICATION.md S3.2, 2026-08-03) :
	// les ~55 presets admin ont été consolidés sur un preset PARTAGÉ unique
	// (`ADMIN_LIMIT`, dédup par identité d'objet — le pattern WISHLIST ci-dessous).
	it("collecte bien l'ensemble des presets du repo", () => {
		expect(PRESETS.size).toBeGreaterThan(25);
	});

	it("chaque preset porte un `name` non vide", () => {
		const anonymes = [...PRESETS.entries()]
			.filter(([config]) => !config.name || config.name.trim() === "")
			.map(([, paths]) => paths.join(" / "));

		expect(anonymes).toEqual([]);
	});

	it("chaque `name` respecte la convention kebab-case", () => {
		const horsConvention = [...PRESETS.entries()]
			.filter(([config]) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(config.name))
			.map(([config, paths]) => `${paths.join(" / ")} → "${config.name}"`);

		expect(horsConvention).toEqual([]);
	});

	// LE cœur de KI-004 : deux presets DISTINCTS partageant un nom partagent un
	// compteur, et la fenêtre revient à celui qui a créé l'entrée. Sur des
	// `limit`/`windowMs` différents, cela ré-introduit exactement le verrouillage
	// croisé corrigé le 2026-07-31.
	it("deux presets distincts ne partagent jamais un `name`", () => {
		const parNom = new Map<string, string[]>();
		for (const [config, paths] of PRESETS) {
			parNom.set(config.name, [...(parNom.get(config.name) ?? []), paths.join(" / ")]);
		}

		const collisions = [...parNom.entries()]
			.filter(([, paths]) => paths.length > 1)
			.map(([name, paths]) => `"${name}" ← ${paths.join(" ET ")}`);

		expect(collisions).toEqual([]);
	});

	it("les presets partagés le sont par référence, pas par nom dupliqué", () => {
		// Corollaire du test précédent : un partage de budget VOULU (favoris
		// ADD/REMOVE/TOGGLE, facture/avoir) passe par le même objet, ce qui le rend
		// visible à la lecture au lieu d'être un accident de nommage.
		const partages = [...PRESETS.values()].filter((paths) => paths.length > 1);
		expect(partages.length).toBeGreaterThan(0);
	});
});
