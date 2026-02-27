import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/font/google (imported transitively via barrel → unsaved-changes-dialog → alert-dialog → fonts)
vi.mock("next/font/google", () => {
	const fontMock = () => ({
		className: "mock-font",
		variable: "--mock-font",
		style: { fontFamily: "mock" },
	});
	return {
		Inter: fontMock,
		Cormorant_Garamond: fontMock,
		Petit_Formal_Script: fontMock,
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
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/produits",
}));

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
	NavigationMenuLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	NavigationMenuTrigger: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<button type="button" {...props}>
			{children}
		</button>
	),
	NavigationMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	navigationMenuTriggerStyle: () => "",
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

import { DesktopNav } from "./desktop-nav";

afterEach(cleanup);

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
		href: "/personnalisation",
		label: "Personnalisation",
		icon: "sparkles" as const,
	},
];

describe("DesktopNav", () => {
	it("renders all nav items", () => {
		render(<DesktopNav navItems={navItems} />);

		expect(screen.getByText("Les créations")).toBeInTheDocument();
		expect(screen.getByText("Les collections")).toBeInTheDocument();
		expect(screen.getByText("Personnalisation")).toBeInTheDocument();
	});

	it("renders simple items as links", () => {
		render(<DesktopNav navItems={navItems} />);

		const link = screen.getByRole("link", { name: "Personnalisation" });
		expect(link.getAttribute("href")).toBe("/personnalisation");
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

		const link = screen.getByRole("link", { name: "Personnalisation" });
		expect(link.getAttribute("aria-current")).toBeNull();
	});

	it("renders mega menu content for dropdown items", () => {
		render(<DesktopNav navItems={navItems} />);

		expect(screen.getByTestId("mega-menu-creations")).toBeInTheDocument();
		expect(screen.getByTestId("mega-menu-collections")).toBeInTheDocument();
	});
});
