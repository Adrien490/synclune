import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ICONS_CONFIG } from "@/shared/constants/icons-config";

import {
	FIVE_PATH,
	GLOSS_PATH,
	HEART_PATH,
	SPARK_LEFT_PATH,
	SPARK_RIGHT_PATH,
} from "../logo-mark.paths";

/**
 * @regression favicon-mark-parity
 *
 * Le favicon SVG est un DOUBLON du mark : un fichier statique n'a pas accès aux
 * jetons CSS, donc ses chemins sont recopiés depuis `logo-mark.paths.ts` au lieu
 * d'être importés. C'est exactement la situation qui a laissé les 17 PNG de
 * `public/icons/` figés sur l'ancien logo pendant que le vectoriel évoluait :
 * personne ne voit un favicon périmé, il n'y a ni typecheck ni rendu qui le lise.
 *
 * Ce test est le lien entre les deux. Il vérifie la GÉOMÉTRIE, pas le style —
 * le trait et les couleurs divergent à dessein (cf. l'en-tête du SVG).
 *
 * Depuis l'audit logo du 2026-08-15, le favicon est la variante MICRO : carré
 * plein (le fond EST le socle), viewBox recadrée sur le cœur, traits épaissis.
 * À 16 px — la taille où un favicon vit vraiment — le disque complet était une
 * tache rose : contour à 0,31 px, sous le pixel. Le fichier est GÉNÉRÉ par
 * `scripts/generate-brand-icons.ts` (comme tous les rasters, verrouillés eux
 * par `brand-icons-manifest.regression.test.ts`).
 *
 * Il garde aussi la DÉCLARATION : un favicon que `metadata.icons` n'annonce pas
 * n'est servi à personne. Next n'injecte les icônes de convention que si l'objet
 * `metadata` n'en déclare aucune (`if (!resolvedMetadata.icons)` dans
 * `resolve-metadata.js`) — et celui du dépôt en déclare.
 */

const FAVICON_PATH = join(process.cwd(), "public/icons/logo-mark.svg");
const FAVICON_URL = "/icons/logo-mark.svg";

const svg = readFileSync(FAVICON_PATH, "utf8");

describe("favicon SVG ↔ SSOT du mark", () => {
	it.each([
		["le cœur", HEART_PATH],
		["le 5", FIVE_PATH],
		["l'étincelle gauche", SPARK_LEFT_PATH],
		["l'étincelle droite", SPARK_RIGHT_PATH],
	])("reprend %s à l'identique", (_, d) => {
		expect(svg).toContain(d);
	});

	it("garde le 5 en découpe, comme le mark web", () => {
		// Sans `evenodd`, la boucle et la barre se remplissent : le 5 devient
		// une masse rose pleine, et à 16 px il ne reste qu'une tache.
		expect(svg).toMatch(/fill-rule="evenodd"/);
	});

	it("est la variante MICRO : viewBox recadrée, fond carré plein", () => {
		// Le recadrage est ce qui rend le mark lisible à 16 px : le cœur remplit
		// la tuile au lieu de flotter dans un disque devenu illisible.
		expect(svg).toMatch(/viewBox="30 30 196 196"/);
		// Le fond est PEINT (un `background` CSS n'existe pas dans un favicon
		// rasterisé) et couvre exactement la viewBox recadrée.
		expect(svg).toContain('<rect x="30" y="30" width="196" height="196" fill="#fdb8e4"/>');
	});

	it("laisse tomber le REFLET — la variante micro n'en a pas l'usage", () => {
		// À 16 px, le reflet mesure moins d'un pixel de large : il ne peint plus un
		// reflet, il salit le lobe. Le 5, lui, ne saute à aucune taille.
		expect(svg).not.toContain(GLOSS_PATH);
		expect(svg).toContain(FIVE_PATH);
	});

	it("est déclaré EN TÊTE des icônes, sinon il n'est servi à personne", () => {
		const icons = ICONS_CONFIG as { icon: Array<{ url: string; type?: string }> };

		expect(icons.icon[0]?.url).toBe(FAVICON_URL);
		expect(icons.icon[0]?.type).toBe("image/svg+xml");
		// Les PNG restent le repli : un format que le navigateur ne lit pas doit
		// pouvoir retomber sur le suivant.
		expect(icons.icon.length).toBeGreaterThan(1);
	});
});
