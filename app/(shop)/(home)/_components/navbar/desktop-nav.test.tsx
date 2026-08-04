import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// Mock next/font/google (imported transitively via barrel → unsaved-changes-dialog → alert-dialog → fonts)
vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return {
		Figtree: fontMock,
		Fraunces: fontMock,
		Sacramento: fontMock,
	};
});

// Mock next/link
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

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => "/produits",
}));

/**
 * Espion du signal Base UI qui court-circuite le gestionnaire interne du trigger.
 *
 * ⚠️ Ce n'est PAS `preventDefault()`. Base UI ne consulte jamais
 * `defaultPrevented` : ses gestionnaires sont fusionnés par `mergeProps`, qui ne
 * les saute que sur `event.preventBaseUIHandler()`. Le mock du trigger reproduit
 * donc ce contrat, sinon le composant lèverait sur une méthode absente.
 */
const preventBaseUIHandler = vi.fn();

// Mock NavigationMenu components to render children directly
vi.mock("@/shared/components/ui/navigation-menu", () => ({
	NavigationMenu: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => <nav {...props}>{children}</nav>,
	NavigationMenuList: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => <ul {...props}>{children}</ul>,
	NavigationMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
	// `renderPropMock` et non `<>{children}</>` : le lien passe désormais par
	// `render={<Link/>}`. Un mock qui ignore `render` fait DISPARAÎTRE l'ancre du
	// DOM, et tous les `getByRole("link")` échouent sans que le composant réel
	// soit en cause (cf. `test/mocks/render-prop.tsx`).
	NavigationMenuLink: (props: RenderPropMockProps) => renderPropMock("a", props),
	NavigationMenuTrigger: ({
		children,
		onClick,
		showChevron: _showChevron,
		...props
	}: {
		children: React.ReactNode;
		onClick?: (event: unknown) => void;
		showChevron?: boolean;
		[key: string]: unknown;
	}) => (
		<button
			type="button"
			onClick={(event) => {
				Object.assign(event, { preventBaseUIHandler });
				onClick?.(event);
			}}
			{...props}
		>
			{children}
		</button>
	),
	NavigationMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	NavigationMenuPopup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
	navigationMenuTriggerStyle: "",
}));

// Mock mega menu sub-components
vi.mock("./mega-menu-creations", () => ({
	MegaMenuCreations: () => <div data-testid="mega-menu-creations" />,
}));

vi.mock("./mega-menu-collections", () => ({
	MegaMenuCollections: () => <div data-testid="mega-menu-collections" />,
}));

// Mock useActiveNavbarItem
vi.mock("@/shared/hooks/use-active-navbar-item", () => ({
	useActiveNavbarItem: () => ({
		isMenuItemActive: (href: string) => href === "/produits",
	}),
}));

// Mock useIsTouchDevice — toggled per test to exercise the F3 touch branch
let mockIsTouch = false;
vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: () => mockIsTouch,
}));

import { DesktopNav } from "./desktop-nav";

afterEach(() => {
	cleanup();
	mockIsTouch = false;
	preventBaseUIHandler.mockClear();
});

const navItems = [
	{
		href: "/produits",
		label: "Les créations",
		icon: "gem" as const,
		hasDropdown: true,
		dropdownType: "creations" as const,
		children: [
			{ href: "/produits", label: "Toutes les créations", icon: "gem" as const },
			{ href: "/produits/bagues", label: "Bagues" },
		],
	},
	{
		href: "/collections",
		label: "Les collections",
		icon: "folder-open" as const,
		hasDropdown: true,
		dropdownType: "collections" as const,
		children: [
			{ href: "/collections", label: "Toutes les collections", icon: "folder-open" as const },
		],
	},
	{
		href: "/a-propos",
		label: "L'atelier",
		icon: "info" as const,
	},
];

describe("DesktopNav", () => {
	it("renders all nav items", () => {
		render(<DesktopNav navItems={navItems} />);

		expect(screen.getByText("Les créations")).toBeInTheDocument();
		expect(screen.getByText("Les collections")).toBeInTheDocument();
		expect(screen.getByText("L'atelier")).toBeInTheDocument();
	});

	it("renders simple items as links", () => {
		render(<DesktopNav navItems={navItems} />);

		const link = screen.getByRole("link", { name: "L'atelier" });
		expect(link.getAttribute("href")).toBe("/a-propos");
	});

	it("renders dropdown items as buttons (triggers)", () => {
		render(<DesktopNav navItems={navItems} />);

		const creationsButton = screen.getByRole("button", { name: "Les créations" });
		expect(creationsButton).toBeInTheDocument();
	});

	it("marks the active dropdown trigger with aria-current=page", () => {
		render(<DesktopNav navItems={navItems} />);

		const activeButton = screen.getByRole("button", { name: "Les créations" });
		expect(activeButton.getAttribute("aria-current")).toBe("page");
	});

	it("does not mark inactive items with aria-current", () => {
		render(<DesktopNav navItems={navItems} />);

		const link = screen.getByRole("link", { name: "L'atelier" });
		expect(link.getAttribute("aria-current")).toBeNull();
	});

	it("renders mega menu content for dropdown items", () => {
		render(<DesktopNav navItems={navItems} />);

		expect(screen.getByTestId("mega-menu-creations")).toBeInTheDocument();
		expect(screen.getByTestId("mega-menu-collections")).toBeInTheDocument();
	});

	describe("keyboard navigation", () => {
		it("does not navigate on Enter key press (Base UI opens the mega menu)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "Enter" });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate on Space key press (toggles dropdown)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: " " });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate on keyboard-triggered click (detail === 0, opens panel)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.click(trigger, { detail: 0 });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("navigates on mouse click on dropdown trigger", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.click(trigger, { detail: 1 });

			expect(mockPush).toHaveBeenCalledWith("/produits");
		});

		it("does not navigate on touch tap — lets Base UI open the panel (F3)", () => {
			mockIsTouch = true;
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			// Touch tap fires a click with detail >= 1, but on a coarse pointer we must
			// open the mega menu instead of navigating away.
			fireEvent.click(trigger, { detail: 1 });

			expect(mockPush).not.toHaveBeenCalled();
			expect(preventBaseUIHandler).not.toHaveBeenCalled();
		});

		it("appelle preventBaseUIHandler au clic souris pour ne pas ouvrir le panneau en plus de naviguer", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.click(trigger, { detail: 1 });

			// ⚠️ Le signal est `preventBaseUIHandler`, PAS `preventDefault` : Base UI
			// ne consulte pas `defaultPrevented`. Asserter l'ancien aurait laissé
			// passer un panneau qui s'ouvre en même temps que la navigation.
			expect(preventBaseUIHandler).toHaveBeenCalledTimes(1);
			expect(mockPush).toHaveBeenCalledWith("/produits");
		});

		it("does not navigate on Escape key (Base UI handles menu close)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "Escape" });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate on ArrowDown (Base UI handles focus shift)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "ArrowDown" });

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	describe("habillage Atelier", () => {
		it("compose les libellés en Fraunces (font-display) sur les liens comme sur les triggers", () => {
			render(<DesktopNav navItems={navItems} />);

			const link = screen.getByRole("link", { name: "L'atelier" });
			expect(link.className).toContain("font-display");
			const trigger = screen.getByRole("button", { name: "Les créations" });
			expect(trigger.className).toContain("font-display");
		});

		it("renders subtle primary-tinted hover background (gold/rose accent)", () => {
			render(<DesktopNav navItems={navItems} />);
			const link = screen.getByRole("link", { name: "L'atelier" });
			expect(link.className).toContain("hover:bg-primary/8");
		});

		it("remplace le filet de 2px par le trait dessiné à la main, qui répond aussi au focus", () => {
			const { container } = render(<DesktopNav navItems={navItems} />);

			// Le `SquiggleUnderline` est rendu pour chaque entrée. Sa valeur ici n'est
			// pas cosmétique : contrairement au `after:scale-x` qu'il remplace, il se
			// dessine sur `group-focus-within` — parité survol/focus (WCAG 2.4.7).
			const paths = container.querySelectorAll("svg path[stroke-linecap='round']");
			expect(paths.length).toBeGreaterThanOrEqual(navItems.length);
			expect(paths[0]?.getAttribute("class")).toContain("group-focus-within:[stroke-dashoffset:0]");
		});

		it("marque d'un trait déjà dessiné l'entrée correspondant à la page courante", () => {
			render(<DesktopNav navItems={navItems} />);

			// `/produits` est actif (cf. mock de useActiveNavbarItem). Sans l'option
			// `drawn`, remplacer le filet permanent par un trait au survol aurait fait
			// disparaître le repère visuel de `aria-current="page"`.
			const activeTrigger = screen.getByRole("button", { name: "Les créations" });
			const activePath = activeTrigger.querySelector("svg path");
			expect(activePath?.getAttribute("class")).toContain("[stroke-dashoffset:0]");

			const inactiveTrigger = screen.getByRole("button", { name: "Les collections" });
			const inactivePath = inactiveTrigger.querySelector("svg path");
			expect(inactivePath?.getAttribute("class")).toContain("[stroke-dashoffset:120]");
		});
	});
});
