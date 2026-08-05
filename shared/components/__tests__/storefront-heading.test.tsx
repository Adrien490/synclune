import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { HandDrawnRail, StorefrontHeading, STROKE_STAGGER_MS } from "../storefront-heading";
import { RAIL_ACCENTS } from "@/modules/products/components/catalog-accents.constants";
import { BRAND } from "@/shared/constants/brand";

afterEach(cleanup);

describe("StorefrontHeading", () => {
	it("rend un h1 unique, visible, portant le titre", () => {
		render(<StorefrontHeading title="Les collections" />);

		const headings = screen.getAllByRole("heading", { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0]).toHaveTextContent("Les collections");
		// Ni `sr-only` ni `hidden` : le h1 doit exister sous 40rem — c'est tout
		// l'objet du montage « L'étal continue ».
		expect(headings[0]!.className).not.toMatch(/\bsr-only\b/);
		expect(headings[0]!.className).not.toMatch(/\bhidden\b/);
	});

	it("affiche l'eyebrow d'atelier par défaut, avec la ville", () => {
		render(<StorefrontHeading title="T" />);

		expect(
			screen.getByText(new RegExp(`L'atelier de Léane · ${BRAND.contact.location.city}`)),
		).toBeInTheDocument();
	});

	it("remplace l'eyebrow quand il est fourni", () => {
		render(<StorefrontHeading title="T" eyebrow="Mon eyebrow" />);

		expect(screen.getByText("Mon eyebrow")).toBeInTheDocument();
		expect(screen.queryByText(/L'atelier de Léane/)).not.toBeInTheDocument();
	});

	it("rend les quatre touches de pinceau par défaut, en décoratif, qui se dessinent au montage", () => {
		const { container } = render(<StorefrontHeading title="T" />);

		const rail = container.querySelector('div[aria-hidden="true"]');
		expect(rail).not.toBeNull();

		// Direction « Les quatre touches » (artifact 2026-08-05, reco B) : le rail
		// n'est plus une rangée de spans, ce sont des traits SVG posés à la main.
		const paths = rail!.querySelectorAll("svg path");
		expect(paths).toHaveLength(RAIL_ACCENTS.length);

		paths.forEach((path, index) => {
			// Le dessin passe par `hand-draw-load` (entrance.css) — c'est lui qui
			// porte le repli `prefers-reduced-motion` et Safari ≤ 18 (touche sèche).
			expect(path.getAttribute("class")).toContain("hand-draw-load");
			// `pathLength=1` : la normalisation sans laquelle le dash ne se calcule pas.
			expect(path.getAttribute("pathLength")).toBe("1");
			// Une touche par cran de stagger — l'étal se peint de gauche à droite.
			// La valeur vient de la SSOT (HAND_DRAWN_DURATIONS_MS.railStagger,
			// ré-exportée) : un `120` en dur ici aurait fait échouer le test à
			// chaque retuning du tempo au lieu de suivre la constante.
			expect((path as SVGPathElement).style.getPropertyValue("--hand-delay")).toBe(
				`${index * STROKE_STAGGER_MS}ms`,
			);
		});
	});

	it("réduit le rail à une touche unique quand un accent de famille est fourni", () => {
		const { container } = render(<StorefrontHeading title="T" accent="bg-brand-mint" />);

		const rail = container.querySelector('div[aria-hidden="true"]');
		const paths = rail!.querySelectorAll("svg path");
		expect(paths).toHaveLength(1);
		// La SSOT reste `RAIL_ACCENTS` (des classes bg-*) ; la touche projette la
		// même couleur en trait.
		expect(paths[0]!.getAttribute("class")).toContain("stroke-brand-mint");
	});

	it("ne rend aucun rail avec accent={false}", () => {
		const { container } = render(<StorefrontHeading title="T" accent={false} />);

		expect(container.querySelector('div[aria-hidden="true"]')).toBeNull();
	});

	it("cache la ligne du compteur quand le slot résolu ne rend rien (état vide)", () => {
		// Les trois compteurs font `return null` à zéro résultat : le <p> hôte doit
		// alors disparaître AVEC sa marge (lot 0 — l'état vide s'ouvrait sur un
		// paragraphe fantôme de 8 px).
		const { container } = render(<StorefrontHeading title="T" countSlot={<></>} />);

		const countParagraph = Array.from(container.querySelectorAll("p")).find(
			(p) => p.childNodes.length === 0,
		);
		expect(countParagraph).toBeDefined();
		expect(countParagraph!.className).toContain("empty:hidden");
	});

	it("rend le chapô fourni, et rien sinon", () => {
		const { rerender } = render(<StorefrontHeading title="T" description="Mon chapô." />);
		expect(screen.getByText("Mon chapô.")).toBeInTheDocument();

		rerender(<StorefrontHeading title="T" />);
		expect(screen.queryByText("Mon chapô.")).not.toBeInTheDocument();
	});

	it("rend le countSlot dans un <p> (frontière Suspense chez l'appelant)", () => {
		render(<StorefrontHeading title="T" countSlot={<span>12 pièces</span>} />);

		const count = screen.getByText("12 pièces");
		expect(count.closest("p")).not.toBeNull();
	});

	it("ne signe PAS — le storefront ne paraphe qu'une fois par page, dans le pied de page", () => {
		// Ce bloc est monté sur CINQ routes (/produits, /produits/[type],
		// /collections, /collections/[slug], /favoris). Une signature au
		// défaut en posait donc une deuxième sur chacune, à ~un écran de celle du
		// footer — et un paraphe manuscrit répété cesse d'en être un.
		const { container } = render(
			<StorefrontHeading title="T" description="Chapô." countSlot={<span>12 pièces</span>} />,
		);

		expect(screen.queryByText("— Léane")).not.toBeInTheDocument();
		// La cursive elle-même : c'est ELLE le paraphe, quel que soit le texte posé.
		expect(container.querySelector(".font-cursive")).toBeNull();
	});

	it("rend le h2 sr-only seulement quand listLabel est fourni", () => {
		const { rerender } = render(<StorefrontHeading title="T" listLabel="Liste des favoris" />);

		const h2 = screen.getByRole("heading", { level: 2 });
		expect(h2).toHaveTextContent("Liste des favoris");
		expect(h2.className).toContain("sr-only");

		rerender(<StorefrontHeading title="T" />);
		expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
	});

	it("applique className sur le div hôte du bloc", () => {
		// Échappatoire générique du conteneur — PAS un retour du montage en
		// cellule de grille (re-tranché le 2026-08-05 : le bloc vit en tête de
		// page ; `catalog-heading-above-toolbar.regression.test.ts` interdit tout
		// `col-span` sur ses call sites).
		const { container } = render(<StorefrontHeading title="T" className="pb-2" />);

		expect((container.firstElementChild as HTMLElement).className).toContain("pb-2");
	});

	it("countLive fait du <p> du compteur une région status ; sans lui, aucun role", () => {
		// Le catalogue filtré au rail desktop recompose la grille SANS changer de
		// page : cette ligne est le seul retour parlé de l'opération. Les routes
		// où le compte ne change qu'à la navigation (/collections,
		// /collections/[slug]) ne passent PAS countLive — une région vivante de
		// plus y serait du bruit de lecteur d'écran.
		const { rerender } = render(
			<StorefrontHeading title="T" countSlot={<span>12 pièces</span>} countLive />,
		);
		expect(screen.getByRole("status")).toContainElement(screen.getByText("12 pièces"));

		rerender(<StorefrontHeading title="T" countSlot={<span>12 pièces</span>} />);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});
});

describe("HandDrawnRail — les modes d'animation", () => {
	it("animated={false} rend les touches SÈCHES : aucune classe de dessin, aucune var de tempo", () => {
		// Le mode du squelette : un squelette qui rejouerait le dessin ferait
		// peindre les touches deux fois (squelette puis page).
		const { container } = render(<HandDrawnRail accent="rail" animated={false} />);

		for (const path of container.querySelectorAll("path")) {
			expect(path.getAttribute("class") ?? "").not.toContain("hand-draw");
			expect((path as SVGPathElement).style.getPropertyValue("--hand-duration")).toBe("");
		}
	});

	it("inView bascule le tracé sur la timeline view() — hand-draw-inview, pas -load", () => {
		// Pour une section SOUS la ligne de flottaison (FAQ) : `-load` se serait
		// joué avant que quiconque l'atteigne. Réservé aux accents MONO — sous
		// une timeline view(), --hand-delay ne décale plus rien.
		const { container } = render(<HandDrawnRail accent="bg-brand-sun" inView />);

		const path = container.querySelector("path")!;
		expect(path.getAttribute("class")).toContain("hand-draw-inview");
		expect(path.getAttribute("class")).not.toContain("hand-draw-load");
	});
});
