import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

// Mock COMPORTEMENTAL de next/image : expose les attributs de chargement pour
// que le budget eager/preload soit observable (parité avec le mock du test
// `collection-images-grid` — un scan de source ne verrait pas ces props).
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		loading,
		preload,
		fetchPriority,
		sizes,
		quality,
		style,
	}: {
		src: string;
		alt: string;
		loading?: string;
		preload?: boolean;
		fetchPriority?: string;
		sizes?: string;
		quality?: number;
		style?: React.CSSProperties;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt={alt}
			data-loading={loading}
			data-preload={preload ? "true" : "false"}
			data-fetch-priority={fetchPriority}
			data-sizes={sizes}
			data-quality={quality}
			style={style}
		/>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionChapter } from "../collection-chapter";
import { dataAccentForSlug } from "@/modules/products/components/catalog-accents.constants";

afterEach(() => {
	cleanup();
});

const IMAGES = [
	{ url: "https://cdn/1.jpg", blurDataUrl: null },
	{ url: "https://cdn/2.jpg", blurDataUrl: null },
	{ url: "https://cdn/3.jpg", blurDataUrl: null },
	{ url: "https://cdn/4.jpg", blurDataUrl: null },
];

function renderChapter(props: Partial<React.ComponentProps<typeof CollectionChapter>> = {}) {
	return render(
		<CollectionChapter
			slug="mariage"
			name="Mariage"
			images={IMAGES}
			index={0}
			headingLevel="h2"
			productCount={7}
			description="Pour le plus beau jour de ta vie"
			priceRange={{ min: 4990 }}
			{...props}
		/>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionChapter", () => {
	describe("structure et accessibilité", () => {
		it("annonce la bande par aria-labelledby pointant le heading", () => {
			renderChapter();
			const article = screen.getByRole("article");
			const heading = screen.getByRole("heading", { level: 2, name: "Mariage" });
			expect(article).toHaveAttribute("aria-labelledby", heading.id);
		});

		it("porte un seul lien, étiré sur toute la bande (::after inset-0)", () => {
			renderChapter();
			const links = screen.getAllByRole("link");
			expect(links).toHaveLength(1);
			expect(links[0]!).toHaveAttribute("href", "/collections/mariage");
			expect(links[0]!.className).toContain("after:absolute");
			expect(links[0]!.className).toContain("after:inset-0");
		});

		it("rend un h2 sans qu'on ait à le demander", () => {
			// `/collections` n'a pas de `listLabel` sr-only sur son StorefrontHeading :
			// le défaut doit être h2, sinon la hiérarchie saute h1 → h3.
			render(<CollectionChapter slug="mariage" name="Mariage" images={IMAGES} />);
			expect(screen.getByRole("heading", { level: 2, name: "Mariage" })).toBeInTheDocument();
		});

		// @regression collection-card-no-title-attribute (porté de la carte) : un
		// `title` sur le heading doublerait le tooltip natif du lien.
		it("ne pose pas d'attribut title sur le heading", () => {
			renderChapter();
			expect(screen.getByRole("heading", { level: 2 })).not.toHaveAttribute("title");
		});

		it("rend les tirages décoratifs : alt vide, pas de role group", () => {
			renderChapter();
			const images = document.querySelectorAll("img");
			expect(images.length).toBeGreaterThan(0);
			for (const img of images) {
				expect(img).toHaveAttribute("alt", "");
			}
			expect(screen.queryByRole("group")).not.toBeInTheDocument();
		});
	});

	describe("encre de la série (accentForSlug — P2 de l'audit 2026-08-05)", () => {
		it("pose le data-accent dérivé du slug — le MÊME que le rail de la page fille", () => {
			renderChapter();
			expect(screen.getByRole("article")).toHaveAttribute(
				"data-accent",
				dataAccentForSlug("mariage"),
			);
		});

		it("deux slugs différents peuvent produire deux encres différentes", () => {
			// Sanity du hash, pas de sa distribution : mariage → mint,
			// best-sellers → lavender avec l'implémentation actuelle.
			expect(dataAccentForSlug("mariage")).not.toBe(dataAccentForSlug("best-sellers"));
		});
	});

	describe("eyebrow", () => {
		// @regression collection-card-eyebrow-never-empty (porté) : la ligne ne
		// doit JAMAIS être vide, le squelette la réserve.
		it("affiche le compteur au pluriel", () => {
			renderChapter({ productCount: 7 });
			expect(screen.getByText("7 créations")).toBeInTheDocument();
		});

		it("affiche « Bientôt » à zéro produit", () => {
			renderChapter({ productCount: 0 });
			expect(screen.getByText("Bientôt")).toBeInTheDocument();
		});

		it("retombe sur « Collection » sans compteur", () => {
			renderChapter({ productCount: undefined });
			expect(screen.getByText("Collection")).toBeInTheDocument();
		});

		// @regression collection-card-eyebrow-no-collection-prefix (porté) : le
		// préfixe « Collection · » ne discriminait rien et mangeait la ligne.
		it("ne préfixe jamais le compteur par « Collection · »", () => {
			renderChapter({ productCount: 7 });
			expect(screen.queryByText(/Collection\s*·/)).not.toBeInTheDocument();
		});
	});

	describe("description et prix", () => {
		// @regression collection-card-description-visible-all-viewports (porté) —
		// et le chapitre va plus loin : la description revient en mobile.
		it("rend la description sans la masquer à aucun viewport", () => {
			renderChapter();
			const description = screen.getByText("Pour le plus beau jour de ta vie");
			expect(description.className).not.toMatch(/(?:^|\s)(?:hidden|sr-only)(?:\s|$)/);
			expect(description.className).not.toMatch(/\b(?:sm|md|lg|xl):hidden\b/);
		});

		/**
		 * @regression collection-from-price-two-decimals
		 *
		 * Le from-price se rend à DEUX décimales, jamais en `{ compact: true }`.
		 * `compactFormatter` a `minimumFractionDigits: 0` : il affichait
		 * « 49,9 € » pour 4990 centimes, et « 50 € » pour 5000. C'est le registre
		 * du dashboard et du méga-menu (montants ronds), pas celui d'un prix de
		 * vitrine. Ne pas « rétablir » `compact` ici.
		 */
		it("préfixe le prix par « À partir de », à deux décimales", () => {
			renderChapter({ priceRange: { min: 4990 } });
			expect(screen.getByText("À partir de")).toBeInTheDocument();
			expect(screen.getByText(/49,90\s*€/)).toBeInTheDocument();
		});

		it("garde les deux décimales sur un montant rond", () => {
			renderChapter({ priceRange: { min: 5000 } });
			expect(screen.getByText(/50,00\s*€/)).toBeInTheDocument();
		});

		it("garde le préfixe sur un plancher quelconque", () => {
			renderChapter({ priceRange: { min: 2990 } });
			expect(screen.getByText("À partir de")).toBeInTheDocument();
		});

		it("ne rend aucun bloc prix sans priceRange", () => {
			renderChapter({ priceRange: undefined });
			expect(screen.queryByText("À partir de")).not.toBeInTheDocument();
		});
	});

	describe("tirages", () => {
		it("rend au plus 3 tirages même quand la donnée en porte 4", () => {
			renderChapter();
			expect(document.querySelectorAll("img")).toHaveLength(3);
		});

		/**
		 * @regression collection-chapter-no-dead-view-transition
		 *
		 * Le tirage 0 portait `view-transition-name: collection-<slug>` sans aucune
		 * cible : `app/(shop)/collections/[slug]/page.tsx` ne déclare pas ce nom, et
		 * l'unique autre émetteur (`collection-image-item.tsx`) est gaté sur un prop
		 * `collectionSlug` qu'aucun appelant ne passe. Le
		 * `@view-transition { navigation: auto }` de `app/styles/pwa.css` ne couvre
		 * que le CROSS-document, or les `<Link>` Next naviguent en same-document et
		 * `experimental.viewTransition` est absent de `next.config.ts`. Un
		 * `view-transition-name` crée un stacking context + containment pour rien.
		 *
		 * Condition de réouverture : nommer d'abord la photo héro de la page de
		 * collection, puis rebrancher les deux bouts ensemble (modèle
		 * `product-${id}` : product-card.tsx ↔ gallery.tsx).
		 */
		it("ne pose aucun view-transition-name (aucune cible ne le déclare)", () => {
			renderChapter();
			for (const img of document.querySelectorAll("img")) {
				expect((img as HTMLElement).style.viewTransitionName).toBe("");
			}
		});

		it("redresse au survol (gaté can-hover) ET au focus clavier (jamais gaté)", () => {
			// WCAG 2.4.7 — parité hover/focus : le focus ne doit JAMAIS être
			// derrière `can-hover:` (il ne s'appliquerait pas au clavier tactile).
			renderChapter();
			const frame = document.querySelector("img")!.closest("div")!.parentElement!;
			expect(frame.className).toContain("motion-safe:can-hover:group-hover:rotate-0");
			expect(frame.className).toContain("group-focus-within:rotate-0");
			expect(frame.className).not.toMatch(/can-hover:(group-)?focus/);
		});
	});

	/**
	 * @regression collection-chapter-underline-outside-link
	 *
	 * Le trait dessiné est FRÈRE du lien et garde sa géométrie NATIVE. Les deux
	 * vont ensemble, et chacun corrigeait un défaut mesuré :
	 *
	 * - `width={210} height={16}` sur un viewBox `0 0 120 20` → `preserveAspectRatio`
	 *   valant `xMidYMid meet` par défaut, échelle `min(210/120, 16/20) = 0,8` : le
	 *   tracé était rendu sur 93px commençant à ~59px du bord, avec 57px de vide de
	 *   chaque côté. Tout couple dont le ratio n'est pas 6:1 letterboxe.
	 * - un SVG de 210px DANS un `<Link w-fit>` élargissait la boîte de focus à
	 *   210px autour d'un titre de ~100px (`@utility focus-ring` = outline + ring).
	 */
	describe("@regression collection-chapter-underline-outside-link", () => {
		it("laisse le lien à la mesure du seul titre", () => {
			renderChapter();
			expect(screen.getByRole("link").querySelector("svg")).toBeNull();
		});

		it("rend bien le trait, décoratif, dans la bande", () => {
			renderChapter();
			expect(screen.getByRole("article").querySelector("svg[aria-hidden='true']")).not.toBeNull();
		});

		it("ne passe ni width ni height à HandDrawnUnderline (ratio viewBox 6:1)", () => {
			const source = readFileSync(join(__dirname, "..", "collection-chapter.tsx"), "utf-8");
			const call = /<HandDrawnUnderline\b[^>]*>/.exec(source);
			expect(call, "appel à <HandDrawnUnderline> introuvable").not.toBeNull();
			expect(call![0]).not.toMatch(/\bwidth=/);
			expect(call![0]).not.toMatch(/\bheight=/);
		});
	});

	describe("chapitre sans photo", () => {
		it("rend le cadre en pointillé décoratif, sans aucune image", () => {
			renderChapter({ images: [], productCount: 0 });
			expect(document.querySelectorAll("img")).toHaveLength(0);
			const note = screen.getByText("encore sur l'établi…");
			expect(note.closest("[aria-hidden='true']")).not.toBeNull();
		});

		// La note SUIT le compteur : des produits publiés dont aucun SKU actif ne
		// porte de média IMAGE donnaient « 7 créations » au-dessus d'un « encore sur
		// l'établi… » qui le contredisait.
		it("dit « photos en chemin » quand la collection a bien des produits", () => {
			renderChapter({ images: [], productCount: 7 });
			expect(screen.getByText("7 créations")).toBeInTheDocument();
			expect(screen.getByText("photos en chemin…")).toBeInTheDocument();
			expect(screen.queryByText("encore sur l'établi…")).not.toBeInTheDocument();
		});
	});

	/**
	 * @regression collection-chapter-eager-budget
	 *
	 * Transposition du budget de la planche-contact (`collection-images-eager-budget`,
	 * défaut ×12 payé le 2026-08-05) : 1 seule image `eager` par bande — le tirage 0
	 * des bandes above-fold.
	 *
	 * ⚠️ AUCUN tirage ne porte jamais `preload` ni `fetchPriority="high"`. Le
	 * candidat LCP de `/collections` est du TEXTE (le h1, ou le h2 de la bande 0) ;
	 * dépenser le créneau haute priorité sur un tirage décoratif de 96px (mobile) à
	 * 180px (lg) en `alt=""` le disputait à Winky Sans, déjà en `preload: true`.
	 * C'est la clause `jamais de priorité réseau` ci-dessous qui l'empêche de
	 * revenir.
	 */
	describe("@regression collection-chapter-eager-budget", () => {
		function loadingAttrs() {
			return [...document.querySelectorAll("img")].map((img) => ({
				loading: img.getAttribute("data-loading"),
				preload: img.getAttribute("data-preload"),
				priority: img.getAttribute("data-fetch-priority"),
			}));
		}

		it("bande 0 : tirage 0 eager, les autres lazy", () => {
			renderChapter({ index: 0 });
			const [first, ...rest] = loadingAttrs();
			expect(first!.loading).toBe("eager");
			for (const attrs of rest) {
				expect(attrs.loading).toBe("lazy");
			}
		});

		it("bande above-fold (index 3) : tirage 0 eager, les autres lazy", () => {
			renderChapter({ index: 3 });
			const [first, ...rest] = loadingAttrs();
			expect(first!.loading).toBe("eager");
			for (const attrs of rest) {
				expect(attrs.loading).toBe("lazy");
			}
		});

		it("bande sous la ligne de flottaison (index 4) : tout lazy", () => {
			renderChapter({ index: 4 });
			for (const attrs of loadingAttrs()) {
				expect(attrs.loading).toBe("lazy");
			}
		});

		it.each([0, 3, 4])("bande %i : aucune priorité réseau sur un tirage décoratif", (index) => {
			renderChapter({ index });
			for (const attrs of loadingAttrs()) {
				expect(attrs.preload).toBe("false");
				expect(attrs.priority).toBeNull();
			}
		});
	});
});
