import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { ICONS_CONFIG } from "@/shared/constants/icons-config";

import {
	GLOSS_PATH,
	HEART_PATH,
	INITIAL_PATH,
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
 * Ce test est le seul lien entre les deux. Il vérifie la GÉOMÉTRIE, pas le style
 * — le trait et les couleurs divergent à dessein (cf. l'en-tête du SVG).
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
		["le socle et le cœur", HEART_PATH],
		["l'initiale", INITIAL_PATH],
		["l'étincelle gauche", SPARK_LEFT_PATH],
		["l'étincelle droite", SPARK_RIGHT_PATH],
	])("reprend %s à l'identique", (_, d) => {
		expect(svg).toContain(d);
	});

	it("garde l'initiale en découpe, comme le mark web", () => {
		// Sans `evenodd`, la boucle et la barre se remplissent : l'initiale devient
		// une masse rose pleine, et à 16 px il ne reste qu'une tache.
		expect(svg).toMatch(/fill-rule="evenodd"/);
	});

	it("PEINT son disque, et ne l'hérite d'aucun fond", () => {
		expect(svg).toContain('<circle cx="128" cy="128" r="128" fill="#fdb8e4"/>');
	});

	it("laisse tomber le REFLET — c'est la variante compacte", () => {
		// À 16 px, le reflet mesure moins d'un pixel de large : il ne peint plus un
		// reflet, il salit le lobe. L'initiale, elle, ne saute à aucune taille.
		expect(svg).not.toContain(GLOSS_PATH);
		expect(svg).toContain(INITIAL_PATH);
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
