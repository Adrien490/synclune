/**
 * Génère TOUTES les déclinaisons raster du mark depuis la SSOT vectorielle
 * (`shared/components/logo-mark.paths.ts`), plus le favicon SVG lui-même.
 *
 * ```bash
 * pnpm generate:brand-icons
 * ```
 *
 * Pourquoi ce script existe (audit logo 2026-08-15) : les 17 PNG de
 * `public/icons/` et les 10 splash de `public/splash/` étaient des exports
 * manuels de l'ANCIEN raster — figés pendant que le vectoriel évoluait, sans
 * qu'aucun outil ne le voie. Selon la surface (onglet, écran d'accueil iOS,
 * Google, boîte mail), la marque n'avait pas le même rendu. Désormais :
 * une seule source, un seul script, et un manifest de hachés
 * (`scripts/brand-icons.manifest.json`) verrouillé par
 * `shared/components/__tests__/brand-icons-manifest.regression.test.ts` —
 * toute retouche manuelle d'un asset généré fait échouer la suite.
 *
 * Deux variantes, et la distinction est le CŒUR du correctif :
 *
 * - **micro** (favicon SVG, PNG favicon/apple/ms, tuile splash) — carrée,
 *   recadrée sur le cœur (viewBox 30 30 196 196), traits épaissis (7 unités,
 *   soit ~0,57 px à 16 px contre 0,31 avant), sans reflet. À 16 px, un favicon
 *   est une synecdoque du logo, pas sa réduction homothétique : le disque
 *   complet y était une tache rose (constat P1 de l'audit).
 * - **full** (`public/logo.png`, 512 px) — le mark complet sur son disque,
 *   reflet compris, hors-disque transparent. Consommé par les e-mails
 *   (`EMAIL_LOGO_URL`) et le JSON-LD (`Organization.logo`, `ImageObject`).
 *
 * `public/logo.webp` (le raster peint par Léane) n'est PAS régénéré : c'est la
 * pièce d'origine dont les chemins ont été vectorisés, conservée comme référence
 * de provenance — plus aucune surface ne le sert.
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

import sharp from "sharp";

import {
	FIVE_PATH,
	GLOSS_PATH,
	HEART_PATH,
	SPARK_LEFT_PATH,
	SPARK_RIGHT_PATH,
} from "../shared/components/logo-mark.paths";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Valeurs sRGB des jetons de marque — un fichier statique n'a pas accès aux
 * custom properties CSS. `DISC` = `--primary`, `HEART` = `--secondary`,
 * `INK` = `--logo-ink` (`app/globals.css`).
 */
const DISC = "#fdb8e4";
const HEART = "#ffe2a2";
const INK = "#4c2420";

/** Recadrage de la variante micro : carré centré sur la masse du mark recentré. */
const MICRO_CROP = { x: 30, y: 30, size: 196 };
/** Trait principal micro (unités de viewBox) ; les étincelles gardent le rapport ~2/3 du mark web. */
const MICRO_STROKE = 7;
const MICRO_SPARK_STROKE = 4.7;

/** Trait du mark complet — l'épaisseur d'origine (cf. `STROKE_USER_UNITS`). */
const FULL_STROKE = 3;
const FULL_SPARK_STROKE = 2;

function heartAndFive(stroke: number): string {
	return [
		`<path d="${HEART_PATH}" fill="${HEART}" stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"/>`,
		`<path d="${FIVE_PATH}" fill="${DISC}" stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round" fill-rule="evenodd"/>`,
	].join("\n  ");
}

function sparkles(stroke: number): string {
	return [SPARK_LEFT_PATH, SPARK_RIGHT_PATH]
		.map(
			(d) =>
				`<path d="${d}" fill="#ffffff" stroke="${INK}" stroke-width="${stroke}" stroke-linejoin="round"/>`,
		)
		.join("\n  ");
}

/** La variante micro — carrée, recadrée, épaissie, sans reflet. */
function buildMicroSvg(): string {
	const { x, y, size } = MICRO_CROP;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}" role="img" aria-label="Synclune">
  <!--
    Le mark de marque, variante MICRO - favicon et icones carrees (PWA, iOS, MS).

    GENERE par scripts/generate-brand-icons.ts depuis la SSOT geometrique
    shared/components/logo-mark.paths.ts. Ne pas retoucher a la main : la parite
    des chemins est verrouillee par favicon-mark-parity.regression.test.ts.

    Pourquoi une variante, et pas le disque complet (audit logo 2026-08-15) :
    a 16 px - la taille ou un favicon vit vraiment - le mark entier etait une
    tache rose : contour a 0,31 px, sous le pixel. Ici le carre est plein
    (le fond EST le socle), la viewBox est recadree sur le coeur, le trait vaut
    ${MICRO_STROKE} unites (~0,57 px a 16 px, 1,14 a 32) et le reflet saute.
    Le 5, lui, ne saute jamais : c'est le glyphe assume de la marque.

    Les couleurs sont EN DUR - un fichier statique n'a pas acces aux jetons
    CSS ; ce sont les valeurs sRGB de primary, secondary et logo-ink.
  -->
  <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${DISC}"/>
  ${heartAndFive(MICRO_STROKE)}
  ${sparkles(MICRO_SPARK_STROKE)}
</svg>
`;
}

/** Le mark complet — disque, reflet, étincelles intérieures (rendu « inside »). */
function buildFullSvg(): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="Synclune">
  <circle cx="128" cy="128" r="128" fill="${DISC}"/>
  ${heartAndFive(FULL_STROKE)}
  <path d="${GLOSS_PATH}" fill="#ffffff" opacity="0.5"/>
  ${sparkles(FULL_SPARK_STROKE)}
</svg>
`;
}

/** ICO = ICONDIR + entrées 16 octets + blobs PNG (le format accepte des PNG embarqués). */
function buildIco(pngs: Array<{ size: number; data: Buffer }>): Buffer {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0); // réservé
	header.writeUInt16LE(1, 2); // type icône
	header.writeUInt16LE(pngs.length, 4);

	const entries: Buffer[] = [];
	let offset = 6 + 16 * pngs.length;
	for (const { size, data } of pngs) {
		const e = Buffer.alloc(16);
		e.writeUInt8(size >= 256 ? 0 : size, 0);
		e.writeUInt8(size >= 256 ? 0 : size, 1);
		e.writeUInt8(0, 2); // palette
		e.writeUInt8(0, 3); // réservé
		e.writeUInt16LE(1, 4); // plans
		e.writeUInt16LE(32, 6); // bits/pixel
		e.writeUInt32LE(data.length, 8);
		e.writeUInt32LE(offset, 12);
		entries.push(e);
		offset += data.length;
	}
	return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

/** Splash iOS : fond clair uni + tuile micro centrée à 35 % de la largeur (mise en page existante). */
const SPLASH_BG = "#fcfcfd";
const SPLASH_SIZES: Array<[number, number]> = [
	[750, 1334],
	[828, 1792],
	[1125, 2436],
	[1170, 2532],
	[1179, 2556],
	[1290, 2796],
	[1620, 2160],
	[1668, 2224],
	[1668, 2388],
	[2048, 2732],
];

async function main() {
	const browser = await chromium.launch();
	const page = await browser.newPage();

	const microSvg = buildMicroSvg();
	const fullSvg = buildFullSvg();

	async function raster(
		svg: string,
		size: number,
		opts: { transparent?: boolean; width?: number; height?: number } = {},
	): Promise<Buffer> {
		const w = opts.width ?? size;
		const h = opts.height ?? size;
		await page.setViewportSize({ width: Math.max(w, 16), height: Math.max(h, 16) });
		await page.setContent(
			`<style>*{margin:0}body{background:transparent}</style>` +
				`<div id="t" style="width:${w}px;height:${h}px">` +
				svg.replace("<svg ", `<svg width="${w}" height="${h}" `) +
				`</div>`,
		);
		const el = page.locator("#t");
		return el.screenshot({ omitBackground: opts.transparent ?? false, type: "png" });
	}

	const outputs = new Map<string, Buffer | string>();

	// Le favicon SVG lui-même — la variante micro EST le favicon.
	outputs.set("public/icons/logo-mark.svg", microSvg);

	// PNG favicon + icônes carrées (toutes depuis la micro).
	const squares: Array<[string, number]> = [
		["public/icons/favicon-16x16.png", 16],
		["public/icons/favicon-32x32.png", 32],
		["public/icons/favicon-96x96.png", 96],
		["public/icons/apple-icon-57x57.png", 57],
		["public/icons/apple-icon-60x60.png", 60],
		["public/icons/apple-icon-72x72.png", 72],
		["public/icons/apple-icon-76x76.png", 76],
		["public/icons/apple-icon-114x114.png", 114],
		["public/icons/apple-icon-120x120.png", 120],
		["public/icons/apple-icon-144x144.png", 144],
		["public/icons/apple-icon-152x152.png", 152],
		["public/icons/apple-icon-180x180.png", 180],
		["public/icons/apple-icon-precomposed.png", 192],
		["public/icons/ms-icon-70x70.png", 70],
		["public/icons/ms-icon-144x144.png", 144],
		["public/icons/ms-icon-150x150.png", 150],
		["public/icons/ms-icon-310x310.png", 310],
	];
	for (const [path, size] of squares) {
		outputs.set(path, await raster(microSvg, size));
	}

	// favicon.ico multi-tailles (il n'en portait qu'une : 32 px).
	// ⚠️ Ré-encodage RGBA obligatoire : une capture Chromium opaque sort en PNG
	// RGB, et Turbopack REFUSE un ICO dont le PNG n'est pas RGBA au build
	// (« The PNG is not in RGBA format! ») — le build entier échoue.
	const icoPngs = [];
	for (const size of [16, 32, 48]) {
		const rgba = await sharp(await raster(microSvg, size))
			.ensureAlpha()
			.png({ palette: false })
			.toBuffer();
		icoPngs.push({ size, data: rgba });
	}
	outputs.set("app/favicon.ico", buildIco(icoPngs));

	// Le mark complet pour les e-mails et le JSON-LD (hors-disque transparent).
	outputs.set("public/logo.png", await raster(fullSvg, 512, { transparent: true }));

	// Splash iOS : fond + tuile micro centrée.
	for (const [w, h] of SPLASH_SIZES) {
		const tile = Math.round(w * 0.35);
		await page.setViewportSize({ width: w, height: h });
		await page.setContent(
			`<style>*{margin:0}body{width:${w}px;height:${h}px;background:${SPLASH_BG};display:grid;place-items:center}</style>` +
				`<div style="width:${tile}px;height:${tile}px">` +
				microSvg.replace("<svg ", `<svg width="${tile}" height="${tile}" `) +
				`</div>`,
		);
		outputs.set(`public/splash/apple-splash-${w}-${h}.png`, await page.screenshot({ type: "png" }));
	}

	await browser.close();

	const manifest: Record<string, string> = {};
	for (const [rel, content] of [...outputs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
		const abs = join(ROOT, rel);
		mkdirSync(join(abs, ".."), { recursive: true });
		writeFileSync(abs, content);
		manifest[rel] = createHash("sha256")
			.update(typeof content === "string" ? Buffer.from(content) : content)
			.digest("hex");
		console.log(`✓ ${rel}`);
	}
	writeFileSync(
		join(ROOT, "scripts/brand-icons.manifest.json"),
		JSON.stringify(manifest, null, "\t") + "\n",
	);
	console.log(`✓ scripts/brand-icons.manifest.json (${outputs.size} assets)`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
