import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
		<a href={href} {...props}>{children}</a>
	),
}));

// Mock SheetClose to render children directly
vi.mock("@/shared/components/ui/sheet", () => ({
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Badge
vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

// Mock LogoutAlertDialog
vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sub-components
vi.mock("./collection-mini-grid", () => ({
	CollectionMiniGrid: () => <div data-testid="collection-grid" />,
}));

vi.mock("./section-header", () => ({
	SectionHeader: ({ children, id }: { children: React.ReactNode; id: string }) => (
		<h2 id={id}>{children}</h2>
	),
}));

vi.mock("./user-header", () => ({
	UserHeader: () => <div data-testid="user-header" />,
}));

// Mock hooks
vi.mock("@/shared/hooks/use-active-navbar-item", () => ({
	useActiveNavbarItem: () => ({
		isMenuItemActive: () => false,
	}),
}));

const mockStore = { wishlistCount: 2, cartCount: 1 };
vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

import { MenuSheetNav } from "./menu-sheet-nav";

afterEach(cleanup);

const productTypes = [
	{ slug: "bagues", label: "Bagues" },
	{ slug: "colliers", label: "Colliers" },
];

const collections = [
	{
		slug: "mariage",
		label: "Mariage",
		images: [{ url: "/img.jpg", blurDataUrl: null, alt: null }],
	},
];

const baseNavItems = [
	{ href: "/", label: "Accueil", icon: "home" as const },
	{ href: "/produits", label: "Les créations", icon: "gem" as const, hasDropdown: true },
	{ href: "/collections", label: "Les collections", icon: "folder-open" as const, hasDropdown: true },
	{ href: "/personnalisation", label: "Personnalisation", icon: "sparkles" as const },
	{ href: "/compte", label: "Mon compte", icon: "user" as const },
	{ href: "/favoris", label: "Mes favoris", icon: "heart" as const },
];

describe("MenuSheetNav", () => {
	describe("sections", () => {
		it("renders discover, creations, collections, and account sections", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
					isOpen
				/>
			);

			expect(screen.getByText("Découvrir")).toBeDefined();
			expect(screen.getByText("Nos créations")).toBeDefined();
			expect(screen.getByText("Collections")).toBeDefined();
			expect(screen.getByText("Compte")).toBeDefined();
		});

		it("renders product type links using ROUTES", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
					isOpen
				/>
			);

			const baguesLink = screen.getByRole("link", { name: "Bagues" });
			expect(baguesLink.getAttribute("href")).toBe("/produits/bagues");

			const colliersLink = screen.getByRole("link", { name: "Colliers" });
			expect(colliersLink.getAttribute("href")).toBe("/produits/colliers");
		});

		it("renders collection links using ROUTES", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
					isOpen
				/>
			);

			const mariageLink = screen.getByRole("link", { name: /Mariage/ });
			expect(mariageLink.getAttribute("href")).toBe("/collections/mariage");
		});
	});

	describe("logged out", () => {
		it("shows sign-in link and sign-up link", () => {
			const loggedOutNavItems = baseNavItems.map((item) =>
				item.href === "/compte" ? { ...item, href: "/connexion", label: "Se connecter", icon: "log-in" as const } : item
			);

			render(
				<MenuSheetNav
					navItems={loggedOutNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
					isOpen
				/>
			);

			expect(screen.getByRole("link", { name: "Se connecter" })).toBeDefined();
			expect(screen.getByRole("link", { name: "Créer un compte" })).toBeDefined();
		});

		it("does not render user header", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={null}
					isOpen
				/>
			);

			expect(screen.queryByTestId("user-header")).toBeNull();
		});
	});

	describe("logged in", () => {
		const session = {
			user: {
				name: "Alice",
				email: "alice@test.com",
				image: null,
				role: "USER",
			},
		};

		it("renders user header", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
					isOpen
				/>
			);

			expect(screen.getByTestId("user-header")).toBeDefined();
		});

		it("renders favorites with badge count", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
					isOpen
				/>
			);

			const badge = screen.getByTestId("badge");
			expect(badge.textContent).toBe("2");
		});

		it("renders orders and logout links", () => {
			render(
				<MenuSheetNav
					navItems={baseNavItems}
					productTypes={productTypes}
					collections={collections}
					session={session}
					isOpen
				/>
			);

			expect(screen.getByRole("link", { name: "Mes commandes" })).toBeDefined();
			expect(screen.getByRole("button", { name: "Déconnexion" })).toBeDefined();
		});
	});
});
