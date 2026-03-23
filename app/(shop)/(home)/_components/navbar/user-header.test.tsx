import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
}));

// Mock SheetClose to render children directly
vi.mock("@/shared/components/ui/sheet", () => ({
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { UserHeader } from "./menu-sheet-nav-sections";

afterEach(cleanup);

const baseSession = {
	user: {
		name: "Alice Dupont",
		email: "alice@test.com",
		image: null,
		role: "USER" as const,
	},
};

describe("UserHeader", () => {
	it("renders the first name greeting", () => {
		render(<UserHeader session={baseSession} wishlistCount={0} cartCount={0} />);

		expect(screen.getByText("Bonjour Alice")).toBeInTheDocument();
	});

	it("falls back to 'vous' when name is null", () => {
		const session = { user: { ...baseSession.user, name: null } };
		render(<UserHeader session={session} wishlistCount={0} cartCount={0} />);

		expect(screen.getByText("Bonjour vous")).toBeInTheDocument();
	});

	it("falls back to 'vous' when name is empty string", () => {
		const session = { user: { ...baseSession.user, name: "" } };
		render(<UserHeader session={session} wishlistCount={0} cartCount={0} />);

		expect(screen.getByText("Bonjour vous")).toBeInTheDocument();
	});

	it("links to the account page", () => {
		render(<UserHeader session={baseSession} wishlistCount={0} cartCount={0} />);

		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe("/commandes");
	});

	it("shows wishlist count when > 0", () => {
		render(<UserHeader session={baseSession} wishlistCount={3} cartCount={0} />);

		expect(screen.getByText("3 favoris")).toBeInTheDocument();
	});

	it("shows singular 'favori' for count of 1", () => {
		render(<UserHeader session={baseSession} wishlistCount={1} cartCount={0} />);

		expect(screen.getByText("1 favori")).toBeInTheDocument();
	});

	it("shows cart count when > 0", () => {
		render(<UserHeader session={baseSession} wishlistCount={0} cartCount={2} />);

		expect(screen.getByText("2 articles")).toBeInTheDocument();
	});

	it("shows singular 'article' for count of 1", () => {
		render(<UserHeader session={baseSession} wishlistCount={0} cartCount={1} />);

		expect(screen.getByText("1 article")).toBeInTheDocument();
	});

	it("shows both wishlist and cart counts with separator", () => {
		render(<UserHeader session={baseSession} wishlistCount={2} cartCount={3} />);

		expect(screen.getByText("2 favoris")).toBeInTheDocument();
		expect(screen.getByText("3 articles")).toBeInTheDocument();
	});

	it("shows fallback text when both counts are 0", () => {
		render(<UserHeader session={baseSession} wishlistCount={0} cartCount={0} />);

		expect(screen.getByText("Mon espace personnel")).toBeInTheDocument();
	});

	it("includes wishlist and cart counts in aria-label", () => {
		render(<UserHeader session={baseSession} wishlistCount={2} cartCount={3} />);

		const link = screen.getByRole("link");
		expect(link.getAttribute("aria-label")).toContain("2 favoris");
		expect(link.getAttribute("aria-label")).toContain("3 articles");
	});
});
