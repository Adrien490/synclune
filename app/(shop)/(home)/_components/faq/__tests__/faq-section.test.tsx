import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FaqSection } from "../faq-section";

/**
 * Structure de la section FAQ — direction « F — Le nuancier, au bon calibre »
 * (2026-08-06), qui succède à « E — L'échantillonnier » du même jour (lavis de
 * famille sur les onze rangées, jugé trop fort) et à « B — La note soleil »
 * (2026-08-05).
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

	it("garde la hiérarchie h2 → h3 (questions + carte), sans saut ni groupe", () => {
		render(<FaqSection />);
		expect(screen.getByRole("heading", { level: 2, name: /Des questions/ })).toBeInTheDocument();
		// Une question = un h3 (headingLevel={3}), les 11, + le titre de la carte
		// « Écris-moi ». Les questions sont remontées de h4 à h3 avec le retrait
		// du regroupement thématique (2026-08-06) : sans les cinq `h3` de groupe,
		// des h4 sauteraient un cran.
		expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(12);
		expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
	});

	it("ne range plus les questions par thème — une seule liste, l'ordre de la SSOT", () => {
		const { container } = render(<FaqSection />);
		// Un seul Accordion : `multiple={false}` porte sur les ONZE questions, donc
		// un seul papier posé à la fois. Cinq accordéons signeraient le retour des
		// groupes (« Les bijoux », « Livraison »…), retirés le 2026-08-06.
		expect(container.querySelectorAll('[data-slot="accordion"]')).toHaveLength(1);
		expect(container.querySelectorAll('[data-slot="accordion-item"]')).toHaveLength(11);
		// Aucun intertitre de groupe. Comparaison sur le NOM ACCESSIBLE, pas sur
		// `textContent` : « Les bijoux » est aussi le début d'une question (« Les
		// bijoux sont-ils vraiment faits main ? »), un `not.toContain` sur le texte
		// de la section serait rouge en permanence.
		const headingNames = screen
			.getAllByRole("heading")
			.map((h) => h.textContent.replace(/ /g, " ").trim());
		for (const label of ["Les bijoux", "Livraison", "Retours et annulation", "Personnalisation"]) {
			expect(headingNames).not.toContain(label);
		}
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

	it("stylise l'item ouvert en note via data-open, à géométrie de texte constante", () => {
		const { container } = render(<FaqSection />);
		const item = container.querySelector('[data-slot="accordion-item"]');
		expect(item).not.toBeNull();
		const cls = item!.className;
		// Le papier vient de la CASCADE (data-accent de la famille), jamais d'un
		// hex : une note menthe sur un papier doré est le défaut que la couleur
		// par famille a corrigé.
		expect(cls).toContain("data-open:bg-(--section-wash-strong)");
		// ⚠️ `--section-wash-strong` (18 % uniformes, mélangé vers `--card`) est
		// le token du PAPIER. `--section-band` est celui d'une BANDE posée sur
		// `--background`, normalisé en ΔE — c'est celui de l'échantillonnier, et
		// il n'a plus rien à peindre ici.
		expect(cls).not.toContain("--section-band");
		// Le retrait est PERMANENT depuis « L'échantillonnier » (2026-08-06), et
		// c'est ce qu'on en garde : l'invariant « le texte ne bouge pas d'un
		// pixel à l'ouverture » est structurel au lieu d'être une arithmétique
		// (marge négative + padding égaux) à maintenir.
		expect(cls).toContain("-mx-3");
		expect(cls).toContain("px-3");
		expect(cls).toContain("sm:-mx-4");
		expect(cls).toContain("sm:px-4");
		expect(cls).not.toContain("data-open:-mx-3");
		expect(cls).not.toContain("data-open:px-3");
		// `ring`, pas `border` : un vrai bord décalerait le texte de 1 px.
		expect(cls).toContain("data-open:ring-1");
		expect(cls).not.toMatch(/data-open:border(?!-transparent)/);
	});

	it("peint chaque question au lavis de SA famille, dans l'ordre de la gamme", () => {
		const { container } = render(<FaqSection />);
		const items = Array.from(container.querySelectorAll('[data-slot="accordion-item"]'));
		// 4 · 3 · 2 · 2 — rose → lavande → menthe → soleil, l'ordre que la page
		// traverse (`section-accents.css`). Les blocs DÉCROISSENT : c'est ce qui
		// se lit comme un nuancier plutôt que comme une alternance. Le tableau
		// est écrit en dur ici À DESSEIN : il doit rester d'accord avec l'ordre
		// de la SSOT, et déplacer une question sans reprendre son `accent`
		// casserait les blocs sans qu'aucun autre test ne le voie.
		expect(items.map((el) => el.getAttribute("data-accent"))).toEqual([
			"rose",
			"rose",
			"rose",
			"rose",
			"lavender",
			"lavender",
			"lavender",
			"mint",
			"mint",
			"sun",
			"sun",
		]);
	});

	it("pose la touche de famille AU REPOS, une par question", () => {
		const { container } = render(<FaqSection />);
		const items = Array.from(container.querySelectorAll('[data-slot="accordion-item"]'));
		expect(items).toHaveLength(11);
		for (const item of items) {
			// Le défaut que la direction traite : avant elle, la couleur
			// n'existait qu'à l'état ouvert — un item sur onze, et zéro tant que
			// le visiteur n'avait rien ouvert. La touche est donc dans le
			// trigger, SANS variante `data-open:`, sur les onze.
			const dabs = item.querySelectorAll('[data-slot="accordion-trigger"] svg path');
			// Une seule : le chevron du trigger est un composant Phosphor, dont
			// le tracé n'est pas un `<path>` nu du même parent — et surtout, deux
			// touches par question voudraient dire que la marque est dupliquée.
			expect(dabs.length).toBeGreaterThanOrEqual(1);
			// L'encre vient de la CASCADE (`data-accent` de l'item), jamais d'un
			// hex ni d'un token figé : `fill-brand-sun` rendrait une touche dorée
			// sur une question menthe.
			const dab = item.querySelector('[data-slot="accordion-trigger"] path[fill]');
			expect(dab).not.toBeNull();
			expect(dab!.getAttribute("fill")).toBe("var(--section-accent)");
		}
	});

	it("calibre la touche à 20 px (16 sous sm) — le plancher du voisin est 22", () => {
		const { container } = render(<FaqSection />);
		const dab = container.querySelector(
			'[data-slot="accordion-trigger"] path[fill]',
		)!.parentElement!;
		// ⚠️ C'est LE point sur lequel « B — Le nuancier » avait été écartée : à
		// 10 px la touche porte ≈ 42 px² d'encre, les onze ensemble ≈ 462 —
		// moins qu'UNE perle du fil de l'atelier (≈ 865 px²), à une section de
		// distance. Les quatre accents valent 1,58 à 2,58:1 sur le fond : à ce
		// contraste une forme n'existe que par sa SURFACE, et la plus petite
		// pièce peinte de la section voisine fait 22 px.
		expect(dab.getAttribute("class")).toContain("size-4");
		expect(dab.getAttribute("class")).toContain("sm:size-5");
		// L'ornement s'efface en contraste forcé : la touche ne porte aucune
		// information indispensable (WCAG 1.4.1), le regroupement par famille
		// est un rappel — l'état ouvert reste le chevron + le panneau.
		expect(dab.getAttribute("class")).toContain("contrast-more:hidden");
		expect(dab.getAttribute("aria-hidden")).toBe("true");
	});

	it("dérive l'anneau de la note de la famille, jamais d'un token figé", () => {
		const { container } = render(<FaqSection />);
		const cls = container.querySelector('[data-slot="accordion-item"]')!.className;
		expect(cls).toContain("data-open:ring-(--section-accent)/40");
		// `ring-brand-sun/40` était juste tant que les onze notes étaient dorées ;
		// il rendrait un anneau soleil sur une note menthe.
		expect(cls).not.toContain("ring-brand-sun");
	});

	it("aligne la réponse sur l'axe du TEXTE de sa question, pas sur la touche", () => {
		const { container } = render(<FaqSection />);
		// Le div de contenu est le petit-fils du Panel — celui qui reçoit le
		// className de l'appelant, fusionné avec le `px-3` par défaut.
		const inner = container.querySelector('[data-slot="accordion-content"] .px-0');
		expect(inner).not.toBeNull();
		// Le retrait reprend EXACTEMENT la touche + son `gap-2` : 16 + 8 = 24 px
		// (`pl-6`) sous `sm`, 20 + 8 = 28 px (`pl-7`) au-dessus. Une réponse
		// alignée sur la touche et non sur le texte rouvrirait le décalage de
		// 12 px sans intention que le lot 0 de l'audit avait corrigé.
		expect(inner!.className).toContain("pl-6");
		expect(inner!.className).toContain("sm:pl-7");
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
