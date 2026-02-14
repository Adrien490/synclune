import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock next/link as a simple anchor
vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
		<a href={href} {...props}>{children}</a>
	),
}));

// Mock Radix Tooltip to render children directly
vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Radix DropdownMenu to render children directly
vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock LogoutAlertDialog to render children
vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { AccountDropdown } from "./account-dropdown";

afterEach(cleanup);

describe("AccountDropdown", () => {
	describe("when not logged in", () => {
		it("renders a sign-in link", () => {
			render(
				<AccountDropdown session={null} isAdmin={false} />
			);

			const link = screen.getByRole("link", { name: "Se connecter" });
			expect(link).toBeDefined();
			expect(link.getAttribute("href")).toBe("/connexion");
		});

		it("does not render dropdown menu items", () => {
			render(
				<AccountDropdown session={null} isAdmin={false} />
			);

			expect(screen.queryByText("Mon compte")).toBeNull();
			expect(screen.queryByText("Déconnexion")).toBeNull();
		});
	});

	describe("when logged in", () => {
		const session = {
			user: {
				name: "Alice Dupont",
				email: "alice@example.com",
				role: "USER" as const,
				image: null,
			},
		};

		it("renders the user name and email", () => {
			render(
				<AccountDropdown session={session} isAdmin={false} />
			);

			expect(screen.getByText("Alice Dupont")).toBeDefined();
			expect(screen.getByText("alice@example.com")).toBeDefined();
		});

		it("renders the account link", () => {
			render(
				<AccountDropdown session={session} isAdmin={false} />
			);

			const link = screen.getByRole("link", { name: /Mon compte/i });
			expect(link).toBeDefined();
		});

		it("renders the logout option", () => {
			render(
				<AccountDropdown session={session} isAdmin={false} />
			);

			expect(screen.getByText("Déconnexion")).toBeDefined();
		});

		it("does not render the admin link when not admin", () => {
			render(
				<AccountDropdown session={session} isAdmin={false} />
			);

			expect(screen.queryByText("Tableau de bord")).toBeNull();
		});

		it("renders the admin link when admin", () => {
			render(
				<AccountDropdown session={session} isAdmin={true} />
			);

			const link = screen.getByRole("link", { name: /Tableau de bord/i });
			expect(link).toBeDefined();
			expect(link.getAttribute("href")).toBe("/admin");
		});

		it("uses the user name in the trigger aria-label", () => {
			render(
				<AccountDropdown session={session} isAdmin={false} />
			);

			const trigger = screen.getByRole("button", { name: "Menu de Alice Dupont" });
			expect(trigger).toBeDefined();
		});
	});
});
