import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FaqSection } from "../faq-section";

/**
 * Structure de la section FAQ — direction « B — La note soleil » (2026-08-05).
 *
 * Avant cette suite, RIEN ne couvrait le rendu de la section : seuls l'`id`
 * (`legal-urls-coherence`, lecture texte) et le titre (`legal-pages.spec.ts`,
 * E2E) étaient verrouillés — tout le visuel pouvait casser sans test rouge.
 */
describe("FaqSection", () => {
	afterEach(cleanup);

	it("porte l'accent de salle sun — la cascade --section-wash* dont dépend la note", () => {
		const { container } = render(<FaqSection />);
		const section = container.querySelector("#faq");
		expect(section).not.toBeNull();
		expect(section!.getAttribute("data-accent")).toBe("sun");
	});

	it("garde la hiérarchie h2 → h3 (groupes + carte) → h4 (questions), sans saut", () => {
		render(<FaqSection />);
		expect(screen.getByRole("heading", { level: 2, name: /Des questions/ })).toBeInTheDocument();
		// 5 groupes + le titre de la carte « Écris-moi ».
		expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
		// Une question = un h4 (headingLevel={4}), les 11.
		expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(11);
	});

	it("écrit les liens de réponse à l'encre rose-strong, jamais au rose de surface", () => {
		const { container } = render(<FaqSection />);
		// Les panneaux fermés sont `hidden` (keepMounted) : les rôles ne les
		// exposent pas, on interroge le DOM — c'est le DOM que Ctrl+F lit aussi.
		const links = Array.from(container.querySelectorAll('[data-slot="accordion-content"] a'));
		expect(links.length).toBeGreaterThanOrEqual(8);
		for (const link of links) {
			// `--primary` rend 1,55:1 sur le fond — le P1 de l'audit : le lien
			// vers la page rétractation était illisible. L'encre est
			// `rose-strong` (5,15:1), soulignée en permanence, hover gaté
			// `can-hover:`.
			expect(link.className).toContain("text-brand-rose-strong");
			expect(link.className).not.toContain("text-primary");
			expect(link.className).toContain("underline");
			expect(link.className).toContain("can-hover:hover:");
		}
	});

	it("stylise l'item ouvert en note soleil via data-open, à géométrie de texte constante", () => {
		const { container } = render(<FaqSection />);
		const item = container.querySelector('[data-slot="accordion-item"]');
		expect(item).not.toBeNull();
		const cls = item!.className;
		// Le fond vient de la CASCADE (data-accent="sun"), jamais d'un hex.
		expect(cls).toContain("data-open:bg-(--section-wash-strong)");
		// Marge négative + padding de même valeur : le texte ne bouge pas d'un
		// pixel à l'ouverture — c'est le papier qui s'étend.
		expect(cls).toContain("data-open:-mx-3");
		expect(cls).toContain("data-open:px-3");
		expect(cls).toContain("sm:data-open:-mx-4");
		expect(cls).toContain("sm:data-open:px-4");
		// `ring`, pas `border` : un vrai bord décalerait le texte de 1 px.
		expect(cls).toContain("data-open:ring-1");
		expect(cls).not.toMatch(/data-open:border(?!-transparent)/);
	});

	it("aligne la réponse sur l'axe de sa question (px-0 sur le panneau)", () => {
		const { container } = render(<FaqSection />);
		// Le div de contenu est le petit-fils du Panel — celui qui reçoit le
		// className de l'appelant, fusionné avec le `px-3` par défaut.
		const inner = container.querySelector('[data-slot="accordion-content"] .px-0');
		expect(inner).not.toBeNull();
	});

	it("rend les réponses fermées trouvables au Ctrl+F (hidden=until-found)", () => {
		const { container } = render(<FaqSection />);
		const panels = Array.from(container.querySelectorAll('[data-slot="accordion-content"]'));
		expect(panels).toHaveLength(11);
		for (const panel of panels) {
			// Un panneau `keepMounted` fermé est `hidden` nu (display:none),
			// invisible à la recherche du navigateur — alors que la suppression
			// du champ de recherche (absorption de /aide) repose exactement sur
			// « tout est dans le DOM + Ctrl+F ». `hiddenUntilFound` fait poser
			// `hidden="until-found"` par Base UI, qui rouvre le panneau trouvé
			// au `beforematch`.
			expect(panel.getAttribute("hidden")).toBe("until-found");
		}
	});

	it("n'accentue la question qu'à l'ouverture (normal fermé, medium ouvert)", () => {
		const { container } = render(<FaqSection />);
		const trigger = container.querySelector('[data-slot="accordion-trigger"]');
		expect(trigger).not.toBeNull();
		// La base du trigger est `font-medium` : sans `font-normal` posé par
		// l'appelant, le `data-panel-open:font-medium` était un no-op et les
		// onze questions pesaient pareil, ouvertes ou non.
		expect(trigger!.className).toContain("font-normal");
		expect(trigger!.className).toContain("data-panel-open:font-medium");
	});

	it("offre la sortie email dès le chapô, à l'encre des liens de réponse", () => {
		const { container } = render(<FaqSection />);
		// Sur mobile, la carte « Écris-moi » n'arrive qu'après les onze
		// questions : le chapô porte son propre mailto. Ciblé par structure
		// (le bloc titre `.enter-inview`) — par rôle, les « écris-moi » des
		// réponses masquées deviendraient ambigus.
		const chapoLink = container.querySelector(".enter-inview a");
		expect(chapoLink).not.toBeNull();
		expect(chapoLink!.getAttribute("href")).toMatch(/^mailto:/);
		expect(chapoLink!.className).toContain("text-brand-rose-strong");
		expect(chapoLink!.className).toContain("underline");
	});

	it("rend la sortie de secours en carte mailto, sans signature", () => {
		const { container } = render(<FaqSection />);
		const cta = screen.getByRole("link", { name: "Écrire à Léane" });
		expect(cta.getAttribute("href")).toMatch(/^mailto:/);
		// Une seule signature par page : le footer. La carte dit « je » sans signer.
		expect(container.textContent).not.toContain("— Léane");
	});
});
