import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression checkout-loading-parity-2026-07-26
 *
 * `app/paiement/loading.tsx` enveloppait chacune des quatre sections du formulaire
 * dans une carte (`bg-card border-primary/10 rounded-2xl border px-6 py-5`), alors que
 * `CheckoutSection` rend une `<section>` NUE. L'utilisateur voyait donc quatre cartes
 * bordées, puis tout s'aplatissait au rendu réel. Divergeaient aussi : l'espacement de
 * la colonne (`space-y-6` contre `space-y-8`), le strip de confiance (encadré contre
 * nu) et la réserve de la barre CTA (absente du squelette).
 *
 * Un squelette n'a de valeur que s'il prédit la mise en page finale ; sinon il
 * remplace un écran vide par un faux écran. Audit UI/UX paiement 2026-07-26, F4.
 *
 * Décision assumée : c'est le SQUELETTE qui suit la page, pas l'inverse.
 * Cartifier `CheckoutSection` serait une refonte visuelle (carte imbriquée dans la
 * section Paiement, qui encadre déjà le PaymentElement) et importerait le langage
 * visuel des formulaires admin (`form-section-styles.ts` est scopé admin).
 */

const REPO_ROOT = process.cwd();

const LOADING = readFileSync(join(REPO_ROOT, "app/paiement/loading.tsx"), "utf-8");
const PAGE = readFileSync(join(REPO_ROOT, "app/paiement/page.tsx"), "utf-8");
const FORM_BODY = readFileSync(
	join(REPO_ROOT, "modules/payments/components/checkout-form-body.tsx"),
	"utf-8",
);
const SECTION = readFileSync(
	join(REPO_ROOT, "modules/payments/components/checkout-section.tsx"),
	"utf-8",
);

function stripComments(source: string): string {
	return source
		.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
}

const LOADING_CODE = stripComments(LOADING);

describe("Checkout — parité squelette / page réelle", () => {
	it("CheckoutSection rend une section NUE (prémisse de tout ce fichier)", () => {
		// Si un jour on cartifie volontairement les sections, ce test tombe le premier
		// et signale qu'il faut mettre le squelette à jour dans le même mouvement.
		const stripped = stripComments(SECTION);
		expect(stripped).toMatch(/<section className="/);
		expect(stripped).not.toMatch(/bg-card/);
		expect(stripped).not.toMatch(/rounded-2xl/);
	});

	it("le squelette n'enveloppe aucune section dans une carte", () => {
		expect(LOADING_CODE).not.toMatch(/bg-card[^"]*rounded-2xl[^"]*border px-6 py-5/);
		expect(LOADING_CODE).not.toMatch(/rounded-2xl border px-6 py-5/);
	});

	it("la colonne formulaire du squelette utilise le même espacement que la page", () => {
		// `space-y-8` côté page (checkout-form-body), donc `space-y-8` côté squelette.
		expect(stripComments(FORM_BODY)).toMatch(/<div className="space-y-8">/);
		expect(LOADING_CODE).toMatch(/className="space-y-8"/);
		expect(LOADING_CODE).not.toMatch(/className="space-y-6"/);
	});

	it("le squelette déclare la réserve --pay-bar-height comme la page", () => {
		const reserve = /pb-\[calc\(var\(--pay-bar-height,8rem\)\+1rem\)\]/;
		expect(stripComments(FORM_BODY)).toMatch(reserve);
		expect(LOADING_CODE).toMatch(reserve);
	});

	it("le squelette n'encadre pas le strip de confiance (la page ne l'encadre pas)", () => {
		expect(LOADING_CODE).not.toMatch(/border-primary\/5 bg-primary\/5 rounded-xl border p-4/);
	});

	it("le squelette suit les breakpoints lg: du résumé", () => {
		expect(LOADING_CODE).toMatch(/rounded-2xl shadow-md lg:hidden/);
		expect(LOADING_CODE).toMatch(/lg:sticky lg:top-8 lg:block/);
		// Le placeholder de barre CTA disparaît au même seuil que la vraie barre.
		expect(LOADING_CODE).toMatch(/backdrop-blur-md lg:hidden/);
	});

	it("réserve la même hauteur pour le PaymentElement que PaymentSectionSkeleton", () => {
		expect(LOADING_CODE).toMatch(/min-h-\[360px\]/);
	});

	it("ni la page ni le squelette n'utilisent theme() (API Tailwind v3)", () => {
		expect(LOADING_CODE).not.toMatch(/theme\(/);
		expect(stripComments(PAGE)).not.toMatch(/theme\(/);
	});

	it("page et squelette partagent le même padding de section", () => {
		const padding = /className="py-4 pb-8 sm:py-8 md:py-10 md:pb-10"/;
		expect(stripComments(PAGE)).toMatch(padding);
		expect(LOADING_CODE).toMatch(padding);
	});
});
