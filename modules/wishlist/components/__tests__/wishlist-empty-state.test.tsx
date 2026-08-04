import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/button", () => ({
	Button: (props: RenderPropMockProps) => renderPropMock("button", props),
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

	/**
	 * @regression empty-state-no-dead-live-region
	 *
	 * Le composant portait une prop `liveAnnouncement` qui rendait
	 * `<div role="status" aria-live="polite">` **conditionnellement**, dans un
	 * composant lui-même monté au moment où la liste devient vide. La région
	 * entrait donc dans l'arbre d'accessibilité au même frame que son texte : cas
	 * où aucun lecteur d'écran n'annonce. La prop donnait une fausse confiance —
	 * trois tests la vérifiaient, aucun ne pouvait détecter qu'elle était inerte.
	 *
	 * L'annonce de la transition appartient désormais à
	 * `wishlist-list-content.tsx`, qui appelle `announce()` sur les régions
	 * globales montées par `AppToaster` (donc présentes AVANT le changement).
	 *
	 * ⚠️ Ne pas réintroduire de région live ici.
	 */
	it("ne rend AUCUNE région live (l'annonce appartient au parent)", () => {
		const { container } = render(<WishlistEmptyState />);

		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(container.querySelector("[aria-live]")).toBeNull();
	});
});
