import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { blendHex, contrastHex, oklchToHex, readOklch } from "@/test/utils/oklch";
import { stripeAppearance, stripeAppearanceDark } from "../stripe-appearance";

/**
 * @regression stripe-appearance-oklab-2026-08-05
 *
 * Ce fichier vérifiait des hex EN DUR — et les hex qu'il verrouillait étaient
 * FAUX. Ils avaient été dérivés en **CIE Lab** au lieu d'**OKLab** : le docblock
 * annonçait `colorText ← --foreground oklch(.13 .01 270)` et le test exigeait
 * `#1a1a2e`, quand la vraie conversion donne `#06070b`. Idem pour
 * `colorTextSecondary`, bloqué sur `#868592` (**3,63:1** sur son propre fond) là
 * où `--muted-foreground` vaut `#53555b` (7,45:1). Le seul texte du tunnel sous
 * le seuil AA était donc gardé par un test vert.
 *
 * Un test qui répète une constante ne peut pas détecter qu'elle est fausse. Il
 * vérifie désormais la DÉRIVATION (la conversion des jetons réels de
 * `app/globals.css`) et les RATIOS DE CONTRASTE, deux choses qu'on ne peut pas
 * satisfaire par accident.
 */

const GLOBALS = readFileSync(join(__dirname, "../../../..", "app/globals.css"), "utf8");

const TOKEN = {
	foreground: () => oklchToHex(...readOklch("--foreground")),
	mutedForeground: () => oklchToHex(...readOklch("--muted-foreground")),
	border: () => oklchToHex(...readOklch("--border")),
	card: () => oklchToHex(...readOklch("--card")),
	destructive: () => oklchToHex(...readOklch("--destructive")),
	roseStrong: () => oklchToHex(...readOklch("--color-brand-rose-strong")),
	primary: () => oklchToHex(...readOklch("--primary")),
};

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe("stripeAppearance — dérivation depuis les jetons", () => {
	it("uses the stripe theme", () => {
		expect(stripeAppearance.theme).toBe("stripe");
	});

	it("colorText EST la conversion OKLab de --foreground", () => {
		expect(stripeAppearance.variables?.colorText).toBe(TOKEN.foreground());
	});

	it("colorTextSecondary EST la conversion OKLab de --muted-foreground", () => {
		expect(stripeAppearance.variables?.colorTextSecondary).toBe(TOKEN.mutedForeground());
	});

	it("colorDanger EST la conversion OKLab de --destructive", () => {
		expect(stripeAppearance.variables?.colorDanger).toBe(TOKEN.destructive());
	});

	it("colorPrimary EST le rose LISIBLE, pas le pastel", () => {
		// `--primary` plafonne à ~1,6:1 : parfait en aplat, illisible en trait.
		// C'est `--color-brand-rose-strong` qui existe pour ce rôle.
		expect(stripeAppearance.variables?.colorPrimary).toBe(TOKEN.roseStrong());
		expect(stripeAppearance.variables?.colorPrimary).not.toBe(TOKEN.primary());
	});

	it("colorBackground EST --card", () => {
		expect(stripeAppearance.variables?.colorBackground).toBe(TOKEN.card());
	});
});

describe("stripeAppearance — contrastes réellement rendus", () => {
	const bg = () => stripeAppearance.variables!.colorBackground as string;

	it("le texte principal passe AA", () => {
		expect(
			contrastHex(stripeAppearance.variables!.colorText as string, bg()),
		).toBeGreaterThanOrEqual(AA_TEXT);
	});

	it("le texte SECONDAIRE passe AA — c'est lui qui échouait à 3,63:1", () => {
		expect(
			contrastHex(stripeAppearance.variables!.colorTextSecondary as string, bg()),
		).toBeGreaterThanOrEqual(AA_TEXT);
	});

	it("le message d'erreur passe AA", () => {
		expect(
			contrastHex(stripeAppearance.variables!.colorDanger as string, bg()),
		).toBeGreaterThanOrEqual(AA_TEXT);
	});
});

describe("stripeAppearance — raccord avec les champs maison", () => {
	it("déclare le MÊME rayon que nos champs (--radius-xl), pas une valeur devinée", () => {
		// `Input` porte `rounded-xl`. Les deux moteurs clampent à la moitié de la
		// hauteur sur une boîte de ~44px : les formes se raccordent par construction,
		// sans qu'on ait à deviner un pixel. Il valait `0.75rem` (12px) face à des
		// champs maison clampés à 22px.
		const radiusXl = /--radius-xl:\s*([^;]+);/.exec(GLOBALS)?.[1]?.trim();
		expect(radiusXl, "--radius-xl introuvable dans globals.css").toBeDefined();
		expect(stripeAppearance.variables?.borderRadius).toBe(radiusXl);
		expect(stripeAppearanceDark.variables?.borderRadius).toBe(radiusXl);
	});

	it("la bordure au repos EST --border", () => {
		expect(stripeAppearance.rules![".Input"]?.border).toContain(TOKEN.border());
	});

	it("le focus reproduit les DEUX couches de `@utility focus-ring`", () => {
		// 2px d'encre `--foreground` (19,59:1) qui portent l'information, puis
		// l'anneau rose de 5px qui porte la marque. Stripe n'accepte pas `outline`
		// dans ses `rules` : deux ombres empilées rendent la même chose, la
		// première déclarée étant peinte au-dessus.
		const shadow = stripeAppearance.rules![".Input:focus"]?.boxShadow ?? "";
		expect(shadow).toContain(`0 0 0 2px ${TOKEN.foreground()}`);
		expect(shadow).toContain(`0 0 0 5px ${TOKEN.primary()}`);
		expect(shadow.indexOf("2px")).toBeLessThan(shadow.indexOf("5px"));
	});

	it("Input padding reaches 44px touch target (14px vertical)", () => {
		expect(stripeAppearance.rules![".Input"]?.padding).toBe("14px 16px");
		expect(stripeAppearanceDark.rules![".Input"]?.padding).toBe("14px 16px");
	});

	it("définit les règles attendues, erreur comprise", () => {
		for (const rule of [".Input", ".Input:focus", ".Input--invalid", ".Tab", ".Label", ".Error"]) {
			expect(stripeAppearance.rules![rule], rule).toBeDefined();
			expect(stripeAppearanceDark.rules![rule], rule).toBeDefined();
		}
	});
});

describe("stripeAppearanceDark — la SEULE surface du site qui bascule vraiment", () => {
	const bg = () => stripeAppearanceDark.variables!.colorBackground as string;

	it("la bordure des champs atteint 3:1 — elle était à 1,54:1", () => {
		// En sombre, la bordure est la seule chose qui dessine le champ : sous 3:1
		// (WCAG 1.4.11) le champ n'existe plus visuellement.
		const border = /#[0-9a-f]{6}/i.exec(stripeAppearanceDark.rules![".Input"]?.border ?? "")?.[0];
		expect(border).toBeDefined();
		expect(contrastHex(border as string, bg())).toBeGreaterThanOrEqual(AA_NON_TEXT);
	});

	it("textes principal et secondaire passent AA", () => {
		expect(
			contrastHex(stripeAppearanceDark.variables!.colorText as string, bg()),
		).toBeGreaterThanOrEqual(AA_TEXT);
		expect(
			contrastHex(stripeAppearanceDark.variables!.colorTextSecondary as string, bg()),
		).toBeGreaterThanOrEqual(AA_TEXT);
		expect(
			contrastHex(stripeAppearanceDark.variables!.colorDanger as string, bg()),
		).toBeGreaterThanOrEqual(AA_TEXT);
	});
});

describe("--destructive tient ses TROIS rôles d'encre", () => {
	/*
	 * Le jeton valait `oklch(0.59 …)` = `#cf4946` et ne passait AA sur AUCUNE des
	 * trois surfaces où il sert de couleur de TEXTE : 4,08:1 sur `bg-destructive/5`,
	 * 4,35:1 sur `--background`, 4,47:1 sur `--card`. C'est tout le chemin d'erreur
	 * du tunnel de paiement — hors ligne, PaymentIntent en échec, carte refusée,
	 * résumé d'erreurs, zone non livrable.
	 */
	const destructive = () => TOKEN.destructive();
	const background = () => oklchToHex(...readOklch("--background"));

	it("sur --background", () => {
		expect(contrastHex(destructive(), background())).toBeGreaterThanOrEqual(AA_TEXT);
	});

	it("sur --card", () => {
		expect(contrastHex(destructive(), TOKEN.card())).toBeGreaterThanOrEqual(AA_TEXT);
	});

	it("sur bg-destructive/5 — la tuile « zone non livrable »", () => {
		expect(
			contrastHex(destructive(), blendHex(destructive(), background(), 0.05)),
		).toBeGreaterThanOrEqual(AA_TEXT);
	});

	it("sur bg-destructive/10", () => {
		expect(
			contrastHex(destructive(), blendHex(destructive(), TOKEN.card(), 0.1)),
		).toBeGreaterThanOrEqual(AA_TEXT);
	});

	it("garde son rôle d'APLAT : blanc sur --destructive passe AA", () => {
		expect(contrastHex("#ffffff", destructive())).toBeGreaterThanOrEqual(AA_TEXT);
	});
});
