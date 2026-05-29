import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
		Caveat: fontMock,
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
		it("does not navigate on Enter key press (Radix opens the mega menu)", () => {
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

		it("calls preventDefault on mouse click to skip Radix's onItemSelect toggle", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			const event = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
			trigger.dispatchEvent(event);

			expect(event.defaultPrevented).toBe(true);
			expect(mockPush).toHaveBeenCalledWith("/produits");
		});

		it("does not navigate on Escape key (Radix handles menu close)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "Escape" });

			expect(mockPush).not.toHaveBeenCalled();
		});

		it("does not navigate on ArrowDown (Radix handles focus shift)", () => {
			mockPush.mockClear();
			render(<DesktopNav navItems={navItems} />);

			const trigger = screen.getByRole("button", { name: "Les créations" });
			fireEvent.keyDown(trigger, { key: "ArrowDown" });

			expect(mockPush).not.toHaveBeenCalled();
		});
	});

	describe("visual polish", () => {
		it("applies tracking-[0.02em] premium letter-spacing on triggers and links", () => {
			render(<DesktopNav navItems={navItems} />);

			const link = screen.getByRole("link", { name: "L'atelier" });
			expect(link.className).toContain("tracking-[0.02em]");
			const trigger = screen.getByRole("button", { name: "Les créations" });
			expect(trigger.className).toContain("tracking-[0.02em]");
		});

		it("renders subtle primary-tinted hover background (gold/rose accent)", () => {
			render(<DesktopNav navItems={navItems} />);
			const link = screen.getByRole("link", { name: "L'atelier" });
			expect(link.className).toContain("hover:bg-primary/8");
		});

		it("binds the underline transition to --ease-spring token", () => {
			render(<DesktopNav navItems={navItems} />);
			const link = screen.getByRole("link", { name: "L'atelier" });
			expect(link.className).toContain("var(--ease-spring)");
		});
	});
});
