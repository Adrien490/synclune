/**
 * Rendu RÉEL du panneau collections du méga-menu (contrairement à
 * `desktop-nav.test.tsx`, qui le mocke) — verrouille l'harmonisation
 * 2026-08-06 : chaque carte re-scope `data-accent` sur SON slug (même hash que
 * la carte landing et la page fille), pendant que le panneau garde l'accent de
 * salle pour son chrome ; le squiggle d'identité est posé AU REPOS ; l'état
 * vide est la même promesse teintée que sur la landing.
 *
 * ⚠️ L'accent de salle était `mint` ; il vaut `rose` depuis le passage de la
 * navigation au mono-rose (2026-08-06, cf. `navbar-section.ts`). La SÉPARATION
 * qu'ils verrouillent est intacte, et c'est elle qui compte : le chrome du
 * panneau porte l'accent de la NAVIGATION, chaque carte celui de SA série. Que
 * les deux niveaux coïncident sur une série rose ne doit pas faire croire que
 * `dataAccentForSlug` peut disparaître.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// Mock next/font/google (importé transitivement via le barrel navigation →
// unsaved-changes-dialog → alert-dialog → fonts, cf. desktop-nav.test.tsx)
vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return {
		Onest: fontMock,
		Winky_Sans: fontMock,
		Kalam: fontMock,
	};
});

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
	useLinkStatus: () => ({ pending: false }),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/",
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

// `renderPropMock` et non `<>{children}</>` : la carte passe par
// `render={<Link/>}` — un mock qui ignore `render` fait disparaître l'ancre
// (cf. `test/mocks/render-prop.tsx`).
vi.mock("@/shared/components/ui/navigation-menu", () => ({
	NavigationMenuLink: (props: RenderPropMockProps) => renderPropMock("a", props),
}));

import { dataAccentForSlug } from "@/modules/products/components/catalog-accents.constants";
import type { NavItemChild } from "@/shared/types/navigation.types";
import { MegaMenuCollections } from "./mega-menu-collections";

function makeCollection(overrides: Partial<NavItemChild> = {}): NavItemChild {
	return {
		href: "/collections/pokemon",
		slug: "pokemon",
		label: "Pokémon",
		description: "Première génération",
		images: [{ url: "https://utfs.io/f/salameche.jpg", blurDataUrl: null, alt: null }],
		...overrides,
	};
}

const VIEW_ALL: NavItemChild = { href: "/collections", label: "Toutes les collections" };

afterEach(cleanup);

describe("MegaMenuCollections", () => {
	it("chaque carte porte l'accent de SA série, le panneau garde le rose de la navigation", () => {
		render(
			<MegaMenuCollections
				collections={[
					VIEW_ALL,
					makeCollection(),
					makeCollection({ href: "/collections/van-gogh", slug: "van-gogh", label: "Van Gogh" }),
				]}
			/>,
		);

		const panel = screen.getByRole("region", { name: /Collections/i });
		expect(panel).toHaveAttribute("data-accent", "rose");

		const pokemon = screen.getByRole("link", { name: /Pokémon/ });
		const vanGogh = screen.getByRole("link", { name: /Van Gogh/ });
		expect(pokemon).toHaveAttribute("data-accent", dataAccentForSlug("pokemon"));
		expect(vanGogh).toHaveAttribute("data-accent", dataAccentForSlug("van-gogh"));

		// « Toutes les collections » est le CTA de salle, pas une carte : pas
		// d'accent de série.
		const viewAll = screen.getByRole("link", { name: /Toutes les collections/ });
		expect(viewAll).not.toHaveAttribute("data-accent");
	});

	it("le squiggle d'identité est posé AU REPOS (drawn) et teinté par l'accent de la carte", () => {
		render(<MegaMenuCollections collections={[makeCollection()]} />);

		const card = screen.getByRole("link", { name: /Pokémon/ });
		const squiggle = card.querySelector('svg[data-slot="squiggle-underline"]');
		expect(squiggle).not.toBeNull();

		const path = squiggle?.querySelector("path");
		// `drawn` : le trait ne se mérite pas au survol — même arbitrage que la
		// carte landing (l'encre teintée est l'identité de la porte).
		expect(path?.getAttribute("class")).toContain("[stroke-dashoffset:0]");
		expect(path?.getAttribute("stroke")).toBe("var(--section-accent)");
	});

	it("l'état vide rend la même promesse teintée que la carte landing", () => {
		render(<MegaMenuCollections collections={[makeCollection({ images: [] })]} />);

		const promise = screen.getByText("Photos à venir");
		expect(promise.parentElement?.className).toContain("bg-(--section-wash)");
	});
});
