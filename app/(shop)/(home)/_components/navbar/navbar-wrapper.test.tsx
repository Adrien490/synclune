import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return { Onest: fontMock, Winky_Sans: fontMock, Kalam: fontMock };
});

let mockPathname = "/";
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname,
}));

import { NavbarWrapper } from "./navbar-wrapper";

describe("NavbarWrapper (sol permanent, accent de salle, état de scroll)", () => {
	beforeEach(() => {
		mockPathname = "/";
	});

	afterEach(() => {
		cleanup();
		window.scrollY = 0;
	});

	function fireScroll(y: number) {
		act(() => {
			window.scrollY = y;
			window.dispatchEvent(new Event("scroll"));
		});
	}

	it("renders <header> with [data-home-navbar] marker for :has() selector", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav>child</nav>
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		expect(header).not.toBeNull();
		expect(header).toHaveAttribute("data-home-navbar");
	});

	it("starts with data-scrolled='false' when page is at the top", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		expect(header).toHaveAttribute("data-scrolled", "false");
	});

	it("flips to data-scrolled='true' once scrollY crosses the 20px threshold", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		fireScroll(21);
		expect(header).toHaveAttribute("data-scrolled", "true");
	});

	it("stays data-scrolled='false' at or below the threshold (20px exactly)", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		fireScroll(20);
		expect(header).toHaveAttribute("data-scrolled", "false");
	});

	it("toggles back to data-scrolled='false' when scrolling back to top", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header");
		fireScroll(150);
		expect(header).toHaveAttribute("data-scrolled", "true");
		fireScroll(0);
		expect(header).toHaveAttribute("data-scrolled", "false");
	});

	// « La devanture » (2026-08-04) : le sol de la barre a quitté le calque de
	// scroll. Il était en `opacity-0` jusqu'à 20px, donc au repos — l'état où l'on
	// découvre chaque page — la barre n'avait ni fond, ni filet, ni grain.
	it("pose le SOL en permanence : fond, filet, grain et flou, sans opacité conditionnelle", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const ground = container.querySelectorAll("header > div[aria-hidden]")[0];
		expect(ground).not.toBeNull();
		const className = ground?.className ?? "";

		expect(className).toContain("bg-background/95");
		expect(className).toContain("border-b");
		expect(className).toContain("polaroid-paper");
		// Le flou vit ICI et pas sur le calque de scroll : posé au-dessus d'un fond
		// quasi opaque, son arrière-plan serait cet aplat — il ne flouterait rien.
		expect(className).toContain("backdrop-blur-md");
		expect(className).not.toContain("opacity-0");
	});

	it("réserve au calque de scroll la seule PROFONDEUR, et n'y anime que l'opacité", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		fireScroll(40);
		const depth = container.querySelectorAll("header > div[aria-hidden]")[1];
		expect(depth).not.toBeNull();
		const className = depth?.className ?? "";

		// Ombre tokenisée (--shadow-header, globals.css).
		expect(className).toContain("shadow-header");
		expect(className).toContain("opacity-0");
		expect(className).toContain("group-data-[scrolled=true]/navbar:opacity-100");
		// Invariant compositor-friendly : aucune propriété non composable animée.
		expect(className).toContain("motion-safe:transition-opacity");
		expect(className).not.toMatch(/transition-\[?(?:all|colors|height)/);
	});

	// Le bandeau consommait `--section-accent` : il virait au lavande sur les
	// créations, au menthe sur les collections, et disparaissait hors boutique. La
	// barre changeait donc de couleur à chaque navigation — jugé instable
	// (décision design 2026-08-04). Il est désormais la SIGNATURE de la marque :
	// toujours peint, toujours `--primary`.
	describe("bandeau de marque", () => {
		it.each([
			["/", "rose"],
			["/collections/mariage", "mint"],
			["/produits", "lavender"],
		])("peint le même filet primary sur %s (accent de salle : %s)", (pathname, accent) => {
			mockPathname = pathname;
			const { container } = render(
				<NavbarWrapper>
					<nav />
				</NavbarWrapper>,
			);

			const band = container.querySelector("header > div.bg-primary");
			expect(band).not.toBeNull();
			// ⚠️ Le bandeau vit DANS la hauteur de la barre (`absolute bottom-0`) et
			// n'est jamais ajouté dessous : sinon le header mesurerait 4px de plus
			// que `--navbar-height`, et tout ce qui s'y accroche se décalerait.
			expect(band?.className).toContain("absolute");
			expect(band?.className).toContain("bottom-0");
			// La couleur ne dérive plus de l'accent de salle.
			expect(band?.className).not.toContain("--section-accent");

			// `data-accent` survit : il alimente `--section-soft` (aplat de l'entrée
			// de nav courante) et le nom de la salle sous `lg`.
			expect(container.querySelector("header")).toHaveAttribute("data-accent", accent);
		});

		it("peint le bandeau jusque hors des salles de la boutique, sans data-accent", () => {
			mockPathname = "/cgv";
			const { container } = render(
				<NavbarWrapper>
					<nav />
				</NavbarWrapper>,
			);
			expect(container.querySelector("header")).not.toHaveAttribute("data-accent");
			expect(container.querySelector("header > div.bg-primary")).not.toBeNull();
		});
	});

	// Le header enveloppe toute la barre : un `group` ANONYME en fait le premier
	// ancêtre `.group` de chacun de ses descendants et lui fait capturer leurs
	// variants. Constaté deux fois — le trait dessiné de CHAQUE entrée de nav
	// s'affichait dès qu'un élément quelconque du header prenait le focus, et les
	// icônes d'action grossissaient au survol de n'importe quel point de la barre.
	it("nomme son groupe (`group/navbar`) et ne squatte pas l'espace de noms anonyme", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const className = container.querySelector("header")?.className ?? "";
		expect(className).toContain("group/navbar");
		expect(className).not.toMatch(/(^|\s)group(\s|$)/);
	});

	it("colle le header en top-0 sans offset ni transform (barre d'annonce retirée)", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header") as HTMLElement | null;
		expect(header?.className).toContain("top-0");
		expect(header?.style.transform).toBe("");
	});

	it("publishes view-transition-name for Next 16 View Transitions API", () => {
		const { container } = render(
			<NavbarWrapper>
				<nav />
			</NavbarWrapper>,
		);
		const header = container.querySelector("header") as HTMLElement | null;
		expect(header?.style.viewTransitionName).toBe("shop-navbar");
	});
});
