import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
		size?: string;
	}) => (asChild ? <>{children}</> : <button>{children}</button>),
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="empty" className={className}>
			{children}
		</div>
	),
	EmptyActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode; variant?: string }) => (
		<div>{children}</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	Heart: ({ className }: { className?: string }) => (
		<svg data-testid="icon-heart" className={className} />
	),
}));

import { WishlistEmptyState } from "../wishlist-empty-state";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
});

describe("WishlistEmptyState", () => {
	it("renders empty container with heading + heart icon", () => {
		render(<WishlistEmptyState />);

		expect(screen.getByTestId("empty")).toBeInTheDocument();
		expect(screen.getByTestId("icon-heart")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /liste de favoris est vide/i })).toBeInTheDocument();
	});

	it("renders both CTA links pointing to /produits and /collections", () => {
		render(<WishlistEmptyState />);

		const produitsLink = screen.getByRole("link", { name: /Découvrir nos créations/i });
		const collectionsLink = screen.getByRole("link", { name: /Voir les collections/i });

		expect(produitsLink).toHaveAttribute("href", "/produits");
		expect(collectionsLink).toHaveAttribute("href", "/collections");
	});

	it("does NOT render the live region when liveAnnouncement is omitted", () => {
		render(<WishlistEmptyState />);

		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("renders a polite live region when liveAnnouncement is provided", () => {
		render(<WishlistEmptyState liveAnnouncement="Votre liste de favoris est maintenant vide" />);

		const liveRegion = screen.getByRole("status");
		expect(liveRegion).toHaveAttribute("aria-live", "polite");
		expect(liveRegion).toHaveClass("sr-only");
		expect(liveRegion).toHaveTextContent("Votre liste de favoris est maintenant vide");
	});

	it("does not set aria-atomic on the live region (audit feedback transverse)", () => {
		render(<WishlistEmptyState liveAnnouncement="…" />);

		expect(screen.getByRole("status")).not.toHaveAttribute("aria-atomic");
	});
});
