import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock — seule la primitive Next l'est : c'est le rendu RÉEL de la section
// (shell, papier lavé, notes d'étapes, polaroid) qu'on teste, comme les
// voisines `collections-section.test.tsx` / `faq-section.test.tsx`.
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

import {
	ATELIER_HOWTO,
	ATELIER_IMAGE,
	ATELIER_IMAGE_ALT,
	ATELIER_STEPS,
} from "@/shared/constants/atelier-content";

import { AtelierSection } from "../atelier-section";

afterEach(cleanup);

describe("AtelierSection — hiérarchie et contrat HowTo", () => {
	it("rend un h2, un seul h3 (= le name du HowTo) et aucun h4", () => {
		render(<AtelierSection />);

		expect(screen.getByRole("heading", { level: 2, name: "Viens voir l'atelier" })).toBeDefined();

		// Le h3 est MOT POUR MOT le `name` du nœud HowTo du @graph : la SSOT
		// `ATELIER_HOWTO` est bi-consommée pour que balisage et visible ne
		// puissent pas diverger.
		const h3s = screen.getAllByRole("heading", { level: 3 });
		expect(h3s).toHaveLength(1);
		expect(h3s[0]!.textContent).toBe(ATELIER_HOWTO.name);

		// Pas de h4 : les titres d'étapes sont des <p> (quatre items d'une ligne
		// dans un <ol> — la FAQ met des h4 sur des items INTERACTIFS repliés,
		// pas le cas ici), donc aucun saut de niveau possible.
		expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
	});

	it("rend une étape par entrée de la SSOT, dans l'ordre, chacune avec son ancre", () => {
		const { container } = render(<AtelierSection />);

		const items = container.querySelectorAll("ol > li");
		expect(items).toHaveLength(ATELIER_STEPS.length);

		ATELIER_STEPS.forEach((step, index) => {
			const item = items[index]!;
			// L'`url` du HowToStep correspondant pointe `#atelier-step-<id>` :
			// sans cette ancre, le schéma référencerait un fragment mort.
			expect(item.id).toBe(`atelier-step-${step.id}`);
			expect(item.textContent).toContain(step.title);
			expect(item.textContent).toContain(step.description);
		});
	});

	it("les numéros d'étapes sont décoratifs (l'<ol> porte déjà l'ordre)", () => {
		const { container } = render(<AtelierSection />);

		const firstItem = container.querySelector("ol > li")!;
		const ornament = firstItem.querySelector('[aria-hidden="true"] svg');
		// Le chiffre ET son cercle vivent sous un même conteneur aria-hidden —
		// sinon VoiceOver annoncerait « 1, 1 sur 4, D'abord une idée ».
		expect(ornament).not.toBeNull();
	});
});

describe("AtelierSection — accent lavande", () => {
	it("porte data-accent='lavender' ET un consommateur du lavis", () => {
		const { container } = render(<AtelierSection />);

		// Un `data-accent` sans consommateur ment sur l'existence d'une cascade
		// (cf. JSDoc d'EtalSection) : ici le papier de la confidence consomme
		// `--section-wash`, c'est lui qui justifie l'attribut.
		const section = container.querySelector("section");
		expect(section?.getAttribute("data-accent")).toBe("lavender");
		expect(container.querySelector(".bg-\\(--section-wash\\)")).not.toBeNull();
	});
});

describe("AtelierSection — portrait", () => {
	// Deux états, branchés sur la SSOT (`docs/LANDING-SECTION-ATELIER.md`,
	// pièce 2) : tant que `ATELIER_IMAGE` est null (asset FOUNDER en 404), le
	// cadre rend la plaque dessinée — jamais un trou blanc publié avec son
	// alt ; le jour du ré-upload, la branche photo reprend seule. Les DEUX
	// branches restent écrites pour que le contrat survive au swap.
	if (ATELIER_IMAGE) {
		it("rend le portrait SSOT avec son alt, et une légende cursive", () => {
			const { container } = render(<AtelierSection />);

			const img = screen.getByRole("img", { name: ATELIER_IMAGE_ALT });
			expect(img.getAttribute("src")).toBe(ATELIER_IMAGE);

			// Une légende de photo, pas une signature (cf. le test de voix).
			const caption = container.querySelector("figcaption");
			expect(caption?.textContent).toContain("C'est moi, Léane");
		});
	} else {
		it("rend la plaque dessinée — aucun <img>, et la légende assume l'attente", () => {
			const { container } = render(<AtelierSection />);

			// Aucune image publiée : ni l'URL morte, ni son alt.
			expect(screen.queryByRole("img")).toBeNull();

			// La plaque est le 2ᵉ consommateur du lavis, APRÈS la confidence —
			// « au moins un » laisserait la confidence perdre le sien en silence
			// (écart e du doc).
			expect(container.querySelectorAll(".bg-\\(--section-wash\\)")).toHaveLength(2);

			const caption = container.querySelector("figcaption");
			// Copie validée au gate maquette du 2026-08-06.
			expect(caption?.textContent).toContain("Le portrait arrive");
		});
	}
});

describe("AtelierSection — le fil (direction 2026-08-06, gate maquette)", () => {
	// Les tracés s'assertent par leur GÉOMÉTRIE NATIVE (viewBox de la SSOT
	// `ATELIER_THREAD_PATHS`) — pas par des test-ids : segments 24×96,
	// vignettes 48×48, nœud 32×32.

	it("enfile un segment par perle (source + inter-perles), chacun dans SON propre svg", () => {
		const { container } = render(<AtelierSection />);

		// 1 segment source (confidence → première perle) + 1 segment entre
		// chaque paire de notes = autant de segments que d'étapes.
		const segments = container.querySelectorAll('svg[viewBox="0 0 24 96"]');
		expect(segments).toHaveLength(ATELIER_STEPS.length);

		// « Un svg par segment, sans exception » : deux paths sous un même svg
		// partageraient la timeline `view()` et se dessineraient d'un seul
		// geste (§ Mouvement du doc).
		segments.forEach((segment) => {
			const paths = segment.querySelectorAll("path");
			expect(paths).toHaveLength(1);
			expect(paths[0]!.classList.contains("hand-draw-inview")).toBe(true);
			// A3 (gate maquette) : le fil est MONO-LAVANDE — perles et
			// vignettes descendent la gamme, pas les segments.
			expect(paths[0]!.getAttribute("stroke")).toBe("var(--color-brand-lavender)");
		});
	});

	it("termine le fil par le nœud, en lavande, sans CTA derrière", () => {
		const { container } = render(<AtelierSection />);

		const knots = container.querySelectorAll('svg[viewBox="0 0 32 32"]');
		expect(knots).toHaveLength(1);
		expect(knots[0]!.querySelector("path")?.getAttribute("stroke")).toBe(
			"var(--color-brand-lavender)",
		);
	});

	it("chaque note porte SA vignette de geste, à l'encre de son étape", () => {
		const { container } = render(<AtelierSection />);

		const items = container.querySelectorAll("ol > li");
		const expectedInks = [
			"var(--primary)",
			"var(--color-brand-lavender)",
			"var(--color-brand-mint)",
			"var(--color-brand-sun)",
		];

		items.forEach((item, index) => {
			const vignettes = item.querySelectorAll('svg[viewBox="0 0 48 48"]');
			expect(vignettes).toHaveLength(1);
			expect(vignettes[0]!.querySelector("path")?.getAttribute("stroke")).toBe(expectedInks[index]);
		});
	});

	it("le processus est une COLONNE unique — la grille 2×2 est morte", () => {
		const { container } = render(<AtelierSection />);

		const list = container.querySelector("ol")!;
		expect(list.className).toContain("flex-col");
		expect(list.className).not.toContain("grid-cols-2");
	});
});

describe("AtelierSection — voix et périmètre", () => {
	it("tutoie — aucun lexique vouvoyant dans le rendu", () => {
		// La copie historique (`docs/atelier-story.md`) VOUVOYAIT : ce test est
		// ce qui empêche de la recopier telle quelle (même défaut co-visible que
		// celui corrigé sur /paiement, `checkout-voice-tutoiement`).
		const { container } = render(<AtelierSection />);

		expect(container.textContent).not.toMatch(/\b(vous|votre|vos|veuillez)\b/iu);
	});

	it("ne signe pas « — Léane » (le storefront ne signe qu'une fois, dans le footer)", () => {
		const { container } = render(<AtelierSection />);

		expect(container.textContent).not.toContain("— Léane");
	});

	it("n'émet aucun JSON-LD local (le HowTo est un nœud du @graph de la page)", () => {
		const { container } = render(<AtelierSection />);

		expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
	});

	it("ne rend aucun lien (rien à lier — la sortie de bas de page appartient à la FAQ)", () => {
		render(<AtelierSection />);

		expect(screen.queryAllByRole("link")).toHaveLength(0);
	});
});
