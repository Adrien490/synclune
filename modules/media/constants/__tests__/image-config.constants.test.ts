/**
 * @regression device-sizes-match-next-config
 *
 * Audit média M17 : `DEVICE_SIZES` duplique les largeurs par défaut de
 * l'optimiseur Next pour construire le `srcSet` de la lightbox. `next.config.ts`
 * ne déclare pas `images.deviceSizes`, donc les deux coïncident aujourd'hui —
 * mais une divergence future serait silencieuse côté build et se manifesterait
 * en 400 sur `/_next/image?w=…` à l'exécution.
 *
 * Ce test échoue dès que `next.config.ts` déclare un `deviceSizes` différent,
 * forçant à ré-aligner les deux (ou à dériver l'un de l'autre).
 */
import { describe, it, expect } from "vitest";
import nextConfig from "@/next.config";
import {
	DEVICE_SIZES,
	IMAGE_QUALITY,
	LIGHTBOX_QUALITY,
	MAIN_IMAGE_QUALITY,
} from "../image-config.constants";

/** Valeurs par défaut de Next lorsque `images.deviceSizes` n'est pas déclaré. */
const NEXT_DEFAULT_DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

describe("DEVICE_SIZES", () => {
	it("reste aligné sur l'optimiseur d'images Next", () => {
		const configured = nextConfig.images?.deviceSizes;

		expect([...DEVICE_SIZES]).toEqual(configured ?? NEXT_DEFAULT_DEVICE_SIZES);
	});

	it("est trié par ordre croissant (prérequis d'un srcSet valide)", () => {
		expect([...DEVICE_SIZES]).toEqual([...DEVICE_SIZES].sort((a, b) => a - b));
	});
});

/**
 * @regression image-quality-tiers-match-next-config
 *
 * Vercel facture chaque couple (source, largeur, qualité) distinct. Le catalogue
 * utilisait 7 valeurs de qualité pour des écarts visuels imperceptibles, soit
 * jusqu'à 56 variantes facturées par image source. Trois paliers suffisent.
 *
 * Ce test échoue si un palier sort de `images.qualities` (l'optimiseur répondrait
 * 400 à l'exécution, invisible au build) ou si un 4ᵉ palier apparaît sans
 * justification de coût.
 */
describe("IMAGE_QUALITY", () => {
	it("n'expose que des paliers déclarés dans next.config images.qualities", () => {
		const declared = nextConfig.images?.qualities;
		expect(declared).toBeDefined();

		for (const tier of Object.values(IMAGE_QUALITY)) {
			expect(declared).toContain(tier);
		}
	});

	it("reste limité à 3 paliers (garde-fou coût transformations)", () => {
		expect(Object.keys(IMAGE_QUALITY)).toHaveLength(3);
		expect(nextConfig.images?.qualities).toHaveLength(3);
	});

	it("aligne la qualité de l'image principale PDP sur celle de la lightbox", () => {
		// Même source + même qualité => les variantes optimisées sont réutilisées
		// au lieu d'en générer un second jeu.
		expect(MAIN_IMAGE_QUALITY).toBe(LIGHTBOX_QUALITY);
	});

	it("n'inclut plus 3840 dans les largeurs (les uploads sont plafonnés à 2048)", () => {
		// Next n'upscale pas : demander 3840 sur une source 2048 ré-encode la même
		// image tout en facturant une variante de plus.
		expect(DEVICE_SIZES).not.toContain(3840);
	});
});
