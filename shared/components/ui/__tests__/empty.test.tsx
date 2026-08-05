import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	EmptyContent,
	EmptyActions,
} from "../empty";

// ============================================================================
// Empty
// ============================================================================

describe("Empty", () => {
	afterEach(cleanup);

	/**
	 * @regression empty-state-no-dead-live-region
	 *
	 * `Empty` avait `role="status"` + `aria-live="polite"` par défaut. Ces défauts
	 * ne pouvaient rien annoncer : un `Empty` est rendu **parce que** la liste est
	 * vide, il entre donc dans l'arbre d'accessibilité au même frame que son texte
	 * — cas où les lecteurs d'écran restent muets. Le seul effet réel était 22
	 * régions live inertes dans le DOM et un risque de relecture parasite.
	 *
	 * Pour annoncer une transition vers l'état vide : `announce()`
	 * (`shared/utils/announce.ts`) depuis le parent, cf. `wishlist-list-content.tsx`.
	 */
	it("n'a PAS de role/aria-live par défaut", () => {
		render(<Empty data-testid="empty">content</Empty>);
		const el = screen.getByTestId("empty");
		expect(el).not.toHaveAttribute("role");
		expect(el).not.toHaveAttribute("aria-live");
	});

	it("accepte role + aria-live en opt-in explicite", () => {
		render(
			<Empty data-testid="empty" role="status" aria-live="polite">
				content
			</Empty>,
		);
		const el = screen.getByTestId("empty");
		expect(el).toHaveAttribute("role", "status");
		expect(el).toHaveAttribute("aria-live", "polite");
	});

	it("has data-slot='empty'", () => {
		render(<Empty data-testid="empty">content</Empty>);
		expect(screen.getByTestId("empty")).toHaveAttribute("data-slot", "empty");
	});

	it("applies default data-variant and data-size", () => {
		render(<Empty data-testid="empty">content</Empty>);
		const el = screen.getByTestId("empty");
		expect(el).toHaveAttribute("data-variant", "default");
		expect(el).toHaveAttribute("data-size", "default");
	});

	it("reflects variant prop in data-variant", () => {
		render(
			<Empty data-testid="empty" variant="borderless">
				content
			</Empty>,
		);
		expect(screen.getByTestId("empty")).toHaveAttribute("data-variant", "borderless");
	});

	it("reflects size prop in data-size", () => {
		render(
			<Empty data-testid="empty" size="lg">
				content
			</Empty>,
		);
		expect(screen.getByTestId("empty")).toHaveAttribute("data-size", "lg");
	});

	it("allows overriding the default role", () => {
		render(
			<Empty data-testid="empty" role="region">
				content
			</Empty>,
		);
		const el = screen.getByTestId("empty");
		expect(el).toHaveAttribute("role", "region");
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});
});

// ============================================================================
// EmptyHeader
// ============================================================================

describe("EmptyHeader", () => {
	afterEach(cleanup);

	it("has data-slot='empty-header'", () => {
		render(<EmptyHeader data-testid="header">header</EmptyHeader>);
		expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "empty-header");
	});

	it("renders children", () => {
		render(<EmptyHeader>Header text</EmptyHeader>);
		expect(screen.getByText("Header text")).toBeInTheDocument();
	});
});

// ============================================================================
// EmptyMedia
// ============================================================================

describe("EmptyMedia", () => {
	afterEach(cleanup);

	it("has aria-hidden='true'", () => {
		render(<EmptyMedia data-testid="media" />);
		expect(screen.getByTestId("media")).toHaveAttribute("aria-hidden", "true");
	});

	it("has data-slot='empty-media'", () => {
		render(<EmptyMedia data-testid="media" />);
		expect(screen.getByTestId("media")).toHaveAttribute("data-slot", "empty-media");
	});

	it("applies default data-variant", () => {
		render(<EmptyMedia data-testid="media" />);
		expect(screen.getByTestId("media")).toHaveAttribute("data-variant", "default");
	});

	it("reflects variant prop in data-variant", () => {
		render(<EmptyMedia data-testid="media" variant="icon" />);
		expect(screen.getByTestId("media")).toHaveAttribute("data-variant", "icon");
	});

	/**
	 * @regression empty-media-finite-sparkle-2026-08-05
	 *
	 * Un état vide PERSISTE — le panneau du panier vide peut rester ouvert indéfiniment —
	 * et son icône tournait de 15° en boucle `infinite`. WCAG 2.2.2 exige un mécanisme de
	 * pause pour tout mouvement automatique de plus de 5 s ; la variante bornée fait
	 * 2 itérations (4 s) et passe donc sous le seuil, sans contrôle à fournir.
	 *
	 * ⚠️ La porte `motion-safe:` ne dispensait de rien : la préférence système est un
	 * confort, pas le mécanisme demandé par 2.2.2.
	 *
	 * Les toasts (`toast-icons.tsx`) gardent délibérément la variante infinie : ils se
	 * démontent au bout de quelques secondes, leur animation est transitoire par
	 * construction. C'est pourquoi ce test vise `EmptyMedia` et pas la classe elle-même.
	 */
	it("borne l'animation d'étincelle, qui ne doit jamais être infinie", () => {
		render(<EmptyMedia data-testid="media" />);
		const media = screen.getByTestId("media");
		expect(media.className).toContain("motion-safe:animate-sparkle-pulse-once");
		// La variante infinie ne doit pas rester en plus : `tailwind-merge` ne fusionne pas
		// deux classes d'animation distinctes, les deux animations coexisteraient.
		expect(media.className).not.toMatch(/animate-sparkle-pulse(?!-once)/);
	});
});

// ============================================================================
// EmptyTitle
// ============================================================================

describe("EmptyTitle", () => {
	afterEach(cleanup);

	it("renders as h3 with data-slot='empty-title'", () => {
		render(<EmptyTitle data-testid="title">Title</EmptyTitle>);
		const el = screen.getByTestId("title");
		expect(el.tagName).toBe("H3");
		expect(el).toHaveAttribute("data-slot", "empty-title");
	});

	it("renders children", () => {
		render(<EmptyTitle>No results found</EmptyTitle>);
		expect(screen.getByText("No results found")).toBeInTheDocument();
	});
});

// ============================================================================
// EmptyDescription
// ============================================================================

describe("EmptyDescription", () => {
	afterEach(cleanup);

	it("renders as p with data-slot='empty-description'", () => {
		render(<EmptyDescription data-testid="desc">Description</EmptyDescription>);
		const el = screen.getByTestId("desc");
		expect(el.tagName).toBe("P");
		expect(el).toHaveAttribute("data-slot", "empty-description");
	});

	it("renders children", () => {
		render(<EmptyDescription>Try a different search.</EmptyDescription>);
		expect(screen.getByText("Try a different search.")).toBeInTheDocument();
	});
});

// ============================================================================
// EmptyContent
// ============================================================================

describe("EmptyContent", () => {
	afterEach(cleanup);

	it("has data-slot='empty-content'", () => {
		render(<EmptyContent data-testid="content">content</EmptyContent>);
		expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "empty-content");
	});
});

// ============================================================================
// EmptyActions
// ============================================================================

describe("EmptyActions", () => {
	afterEach(cleanup);

	it("has data-slot='empty-actions'", () => {
		render(<EmptyActions data-testid="actions">actions</EmptyActions>);
		expect(screen.getByTestId("actions")).toHaveAttribute("data-slot", "empty-actions");
	});

	it("renders children", () => {
		render(
			<EmptyActions>
				<button type="button">Retry</button>
			</EmptyActions>,
		);
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});
