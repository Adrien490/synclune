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
 *
 * ⚠️ **RECIBLÉ le 2026-08-05, refonte « L'établi ».** La prémisse d'origine —
 * « `CheckoutSection` rend une section NUE » — est tombée VOLONTAIREMENT : les
 * quatre étapes portent désormais une surface et un filet d'accent, parce que
 * la hiérarchie était inversée (le récapitulatif pesait plus lourd que le
 * formulaire). Ce test ne meurt pas avec sa prémisse, il la suit : il vérifie
 * maintenant que le squelette rend les MÊMES surfaces, avec les MÊMES accents,
 * dans le MÊME ordre. Ce qu'il protège est inchangé — un squelette qui ne
 * prédit pas la mise en page finale remplace un écran vide par un faux écran.
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
const STRIPE_SECTION = readFileSync(
	join(REPO_ROOT, "modules/payments/components/checkout-stripe-section.tsx"),
	"utf-8",
);
const CONTACT = readFileSync(
	join(REPO_ROOT, "modules/payments/components/checkout-contact-section.tsx"),
	"utf-8",
);
const SUMMARY = readFileSync(
	join(REPO_ROOT, "modules/payments/components/checkout-summary.tsx"),
	"utf-8",
);

function stripComments(source: string): string {
	return source
		.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
}

const LOADING_CODE = stripComments(LOADING);
const SUMMARY_CODE = stripComments(SUMMARY);

describe("Checkout — parité squelette / page réelle", () => {
	it("CheckoutSection rend une SURFACE avec filet d'accent (prémisse de tout ce fichier)", () => {
		// Si un jour on redénude volontairement les sections, ce test tombe le premier
		// et signale qu'il faut mettre le squelette à jour dans le même mouvement.
		const stripped = stripComments(SECTION);
		expect(stripped).toMatch(/<section\s+data-accent=\{accent\}/);
		expect(stripped).toMatch(/bg-card/);
		expect(stripped).toMatch(/rounded-lg/);
		// Le filet est un ÉLÉMENT, jamais un `border-l-(--var)` : Tailwind y
		// arbitrerait entre couleur et largeur.
		expect(stripped).toMatch(/w-\[3px\][^"]*bg-\(--section-accent\)/);
		expect(stripped).not.toMatch(/border-l-\(--/);
	});

	it("le squelette rend les mêmes surfaces accentuées que la page", () => {
		// Géométrie identique à CheckoutSection : surface, filet, rayon, padding.
		expect(LOADING_CODE).toMatch(
			/className="border-border bg-card flex rounded-lg border shadow-sm"/,
		);
		expect(LOADING_CODE).toMatch(/w-\[3px\] shrink-0 rounded-l-lg bg-\(--section-accent\)/);
		expect(LOADING_CODE).toMatch(/className="min-w-0 flex-1 space-y-5 p-5 sm:p-6"/);
	});

	it("les quatre accents sont posés dans le même ordre des deux côtés", () => {
		const order = (src: string) =>
			[...src.matchAll(/accent="(rose|lavender|mint|sun)"/g)].map((m) => m[1]);
		// Page : Contact (rose) vit dans checkout-contact-section, les 3 autres ici.
		expect(order(stripComments(CONTACT))).toEqual(["rose"]);
		expect(order(stripComments(FORM_BODY))).toEqual(["lavender", "mint", "sun"]);
		expect(order(LOADING_CODE)).toEqual(["rose", "lavender", "mint", "sun"]);
	});

	it("le squelette n'annonce plus de ligne « Code promo »", () => {
		// Le modèle `Discount` a été retiré le 2026-08-05 : le squelette réservait
		// encore 44px pour un contrôle qui n'arrive jamais, et disparaissait au
		// rendu réel en remontant tout ce qui le suit.
		expect(LOADING_CODE).not.toMatch(/[Cc]ode promo/);
		expect(stripComments(FORM_BODY)).not.toMatch(/code promo/i);
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

	it("aucun des deux ne réintroduit le strip de confiance retiré", () => {
		// Il portait 2 des 4 mentions de sécurité co-visibles, dont un 2e wordmark
		// Stripe. Une seule subsiste dans la section Paiement, une dans l'en-tête.
		expect(LOADING_CODE).not.toMatch(/border-primary\/5 bg-primary\/5 rounded-xl border p-4/);
		expect(stripComments(STRIPE_SECTION)).not.toMatch(/Propulsé par/);
	});

	it("le bloc de confiance du squelette n'a que les DEUX rangées du résumé", () => {
		// Le filet est DÉRIVÉ du composant réel, pas recopié : la fiche est du papier,
		// donc un filet tireté. Une valeur écrite en dur ici ne pourrait pas voir
		// qu'elle a divergé — c'est exactement comme ça que `stripe-appearance.test.ts`
		// a gardé au vert deux couleurs fausses.
		const separator = SUMMARY_CODE.match(/className="(border-border[^"]*border-dashed pt-4)"/)?.[1];
		expect(separator).toBeDefined();
		expect(LOADING_CODE).toContain(separator!);

		// Et surtout : plus de TROISIÈME rangée. La pastille + libellé qui vivait ici
		// était le reliquat de « Paiement 100% sécurisé », retiré au passage de quatre
		// mentions de sécurité à deux. Le squelette réservait donc une ligne qui ne se
		// peignait jamais — un défaut que l'assertion ci-dessus ne voit pas, parce
		// qu'elle cible un autre motif. Un test écrit POUR un défaut ne voit pas le
		// fork suivant.
		expect(LOADING_CODE).not.toMatch(/size-3\.5 rounded-full/);
	});

	it("le squelette reprend les rayons du résumé, jamais les siens", () => {
		// ⚠️ `--radius-xl` vaut 2rem dans ce dépôt (échelle non standard). Sur une
		// boîte `size-16` (64px), c'est exactement la moitié : la vignette produit
		// était un CERCLE parfait. Les deux fichiers doivent porter le MÊME rayon,
		// et on le lit dans le composant plutôt que de le répéter ici.
		const thumb = SUMMARY_CODE.match(/size-16 shrink-0 overflow-hidden (rounded-[\w-]+)/)?.[1];
		expect(thumb).toBeDefined();
		expect(thumb).not.toBe("rounded-xl");
		expect(LOADING_CODE).toMatch(new RegExp(`size-16 shrink-0 ${thumb}\\b`));

		const totalBlock = SUMMARY_CODE.match(
			/bg-primary\/5 -mx-1 space-y-2 (rounded-[\w-]+) p-3/,
		)?.[1];
		expect(totalBlock).toBeDefined();
		expect(LOADING_CODE).toMatch(new RegExp(`bg-primary/5 -mx-1 space-y-2 ${totalBlock} p-3`));
	});

	it("le squelette suit les breakpoints lg: du résumé", () => {
		expect(LOADING_CODE).toMatch(/relative pt-3 lg:hidden/);
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
