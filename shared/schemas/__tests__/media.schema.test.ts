import { describe, it, expect } from "vitest";
import { blurDataUrlSchema, mediaDimensionSchema } from "../media.schema";

/**
 * Ce fichier couvrait `baseMediaSchema` / `imageMediaSchema` /
 * `nullableImageMediaSchema`, retirés (audit Zod 2026-07-31) : ils n'avaient aucun
 * consommateur en production et dupliquaient `product-media.schemas.ts`, seul
 * schéma de média réellement branché. Restent les deux BRIQUES que ce dernier
 * importe — ce sont elles qui méritent une couverture, puisqu'un défaut y remonte
 * jusqu'à `next/image`.
 */

describe("blurDataUrlSchema", () => {
	it("accepte une data URL d'image", () => {
		expect(blurDataUrlSchema.safeParse("data:image/png;base64,iVBORw0KGgo=").success).toBe(true);
		expect(blurDataUrlSchema.safeParse("data:image/webp;base64,UklGRg==").success).toBe(true);
	});

	it("rejette une URL distante — la valeur part dans `blurDataURL` de next/image", () => {
		expect(blurDataUrlSchema.safeParse("https://utfs.io/f/blur.png").success).toBe(false);
	});

	it("rejette une data URL non-image", () => {
		expect(blurDataUrlSchema.safeParse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
	});

	it("rejette une chaîne vide", () => {
		expect(blurDataUrlSchema.safeParse("").success).toBe(false);
	});

	it("borne la longueur à 10 000 caractères", () => {
		const prefix = "data:image/png;base64,";
		expect(blurDataUrlSchema.safeParse(prefix + "A".repeat(10_000 - prefix.length)).success).toBe(
			true,
		);
		expect(blurDataUrlSchema.safeParse(prefix + "A".repeat(10_001 - prefix.length)).success).toBe(
			false,
		);
	});
});

describe("mediaDimensionSchema", () => {
	it("accepte une dimension entière positive", () => {
		expect(mediaDimensionSchema.safeParse(1).success).toBe(true);
		expect(mediaDimensionSchema.safeParse(1920).success).toBe(true);
	});

	it("rejette zéro et les négatifs", () => {
		expect(mediaDimensionSchema.safeParse(0).success).toBe(false);
		expect(mediaDimensionSchema.safeParse(-1).success).toBe(false);
	});

	it("rejette un décimal", () => {
		expect(mediaDimensionSchema.safeParse(1920.5).success).toBe(false);
	});

	it("borne à 50 000 px — cohérence avec la garde image-bomb", () => {
		expect(mediaDimensionSchema.safeParse(50_000).success).toBe(true);
		expect(mediaDimensionSchema.safeParse(50_001).success).toBe(false);
	});
});
