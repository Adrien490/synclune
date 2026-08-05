import { describe, expect, it } from "vitest";

import { resolveNavbarSection } from "./navbar-section";

describe("resolveNavbarSection", () => {
	it("peint l'accueil en rose, sans nom de salle (la marque suffit)", () => {
		expect(resolveNavbarSection("/")).toEqual({ accent: "rose", label: null });
	});

	it("range les créations en lavande, listing comme sous-type", () => {
		expect(resolveNavbarSection("/produits")).toEqual({
			accent: "lavender",
			label: "Créations",
		});
		expect(resolveNavbarSection("/produits/papilloux")).toEqual({
			accent: "lavender",
			label: "Créations",
		});
	});

	it("range la fiche produit dans la salle des créations", () => {
		// `/creations/<slug>` est la PDP : `useActiveNavbarItem` y allume déjà
		// l'entrée « Les créations » de la nav. Le bandeau dit la même SALLE — dans le
		// registre court du repère, pas dans le libellé de la nav (cf. navbar-section).
		expect(resolveNavbarSection("/creations/collier-papilloux-nacre")).toEqual({
			accent: "lavender",
			label: "Créations",
		});
	});

	it("range les collections en menthe", () => {
		expect(resolveNavbarSection("/collections")).toEqual({
			accent: "mint",
			label: "Collections",
		});
		expect(resolveNavbarSection("/collections/mariage")).toEqual({
			accent: "mint",
			label: "Collections",
		});
	});

	it("réserve le rose aux favoris", () => {
		expect(resolveNavbarSection("/favoris")).toEqual({ accent: "rose", label: "Favoris" });
	});

	// La FAQ a rejoint la landing le 2026-08-05 : `/aide` redirige en 308 vers
	// `/#faq`, donc ce pathname n'atteint plus jamais la barre. Le soleil
	// n'est plus attribué à aucune salle — c'est ce que cette assertion fixe,
	// pour que la branche morte ne revienne pas par recopie.
	it("ne peint plus l'aide : /aide n'est plus une salle", () => {
		expect(resolveNavbarSection("/aide")).toEqual({ accent: null, label: null });
	});

	it("ne peint AUCUN accent hors des salles de la boutique", () => {
		// Ce ne sont pas des salles : le bandeau y retombe sur le filet --border.
		for (const path of [
			"/cgv",
			"/mentions-legales",
			"/confidentialite",
			"/paiement",
			"/paiement/confirmation",
			"/connexion",
			"/suivi-commande",
			"/admin",
		]) {
			expect(resolveNavbarSection(path), path).toEqual({ accent: null, label: null });
		}
	});

	it("n'attrape pas un chemin qui commence par le même préfixe SANS être dessous", () => {
		// Sans le `/` de fin dans la comparaison, `/collections-privees` serait
		// peint en menthe et annoncé « Collections ».
		expect(resolveNavbarSection("/collections-privees")).toEqual({ accent: null, label: null });
		expect(resolveNavbarSection("/produits-archives")).toEqual({ accent: null, label: null });
	});

	it("tolère un pathname absent (premier rendu client)", () => {
		expect(resolveNavbarSection(null)).toEqual({ accent: null, label: null });
	});

	it("ne rend jamais un accent inconnu de section-accents.css", () => {
		const KNOWN = new Set(["rose", "lavender", "mint", "sun"]);
		for (const path of ["/", "/produits", "/collections/mariage", "/favoris", "/cgv"]) {
			const { accent } = resolveNavbarSection(path);
			if (accent !== null) expect(KNOWN.has(accent), `${path} → ${accent}`).toBe(true);
		}
	});
});
