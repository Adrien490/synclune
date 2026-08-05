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
	it("rend le portrait SSOT avec son alt, et une légende cursive", () => {
		const { container } = render(<AtelierSection />);

		const img = screen.getByRole("img", { name: ATELIER_IMAGE_ALT });
		expect(img.getAttribute("src")).toBe(ATELIER_IMAGE);

		// Une légende de photo, pas une signature (cf. le test de voix).
		const caption = container.querySelector("figcaption");
		expect(caption?.textContent).toContain("C'est moi, Léane");
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
