/**
 * @regression cursor-pagination-can-hover
 *
 * Verrouille P1-1 : toutes les classes `hover:*` du composant `CursorPagination`
 * sont préfixées par `can-hover:` pour éviter le bug iOS Safari où le hover
 * state reste collé après tap (sticky-hover). Convention repo confirmée par
 * `[[admin-mobile-header-audit-2026-05-25]]` F4 et applications transverses.
 *
 * Si ce test casse, un nouveau `hover:` brut a été ajouté → préfixer par
 * `can-hover:hover:`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const { mockSearchParams } = vi.hoisted(() => ({
	mockSearchParams: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
	usePathname: () => "/admin/ventes/commandes",
	useSearchParams: () => mockSearchParams.current,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: () => true,
}));

vi.mock("@/shared/components/ui/button-group", () => ({
	ButtonGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="button-group">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<div data-testid="select" data-value={value}>
			{children}
		</div>
	),
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
		<option value={value}>{children}</option>
	),
	SelectTrigger: ({
		children,
		id,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		id: string;
		"aria-label": string;
	}) => (
		<button id={id} aria-label={ariaLabel}>
			{children}
		</button>
	),
	SelectValue: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("lucide-react", () => ({
	ChevronLeft: () => <span data-testid="icon-chevron-left" />,
	ChevronRight: () => <span data-testid="icon-chevron-right" />,
	ChevronsLeft: () => <span data-testid="icon-chevrons-left" />,
	Loader2Icon: () => <span data-testid="icon-loader" />,
}));

import { CursorPagination } from "../cursor-pagination";

describe("CursorPagination — sticky-hover regression (P1-1)", () => {
	beforeEach(() => {
		mockSearchParams.current = new URLSearchParams();
	});
	afterEach(cleanup);

	// Note : le `<Button>` shadcn parent porte ses propres `hover:bg-accent` sans
	// `can-hover:` (drift hors-scope, refactor systémique séparé). On vérifie ici
	// uniquement les classes ajoutées par `PAGINATION_BUTTON_CLASSES` :
	//  - `can-hover:hover:bg-primary/10`, `can-hover:hover:text-primary`,
	//    `can-hover:hover:border-primary/40`
	//  - `motion-safe:can-hover:hover:scale-[1.02]`
	it("custom pagination hover classes must be can-hover: gated", () => {
		render(
			<CursorPagination
				perPage={20}
				hasNextPage
				hasPreviousPage
				currentPageSize={20}
				nextCursor="cm1abc2def3ghi4jkl5mnop"
				prevCursor="cm0abc2def3ghi4jkl5mnop"
			/>,
		);

		const buttons = [
			screen.getByLabelText("Retour au début"),
			screen.getByLabelText("Page précédente"),
			screen.getByLabelText("Page suivante"),
		];

		for (const button of buttons) {
			const className = button.className;
			// Les classes spécifiques au PAGINATION_BUTTON_CLASSES doivent être
			// présentes ET préfixées par `can-hover:` (gating iOS).
			expect(className).toContain("can-hover:hover:bg-primary/10");
			expect(className).toContain("can-hover:hover:text-primary");
			expect(className).toContain("can-hover:hover:border-primary/40");
			expect(className).toContain("motion-safe:can-hover:hover:scale-[1.02]");
			// Garde-fou : aucune variante "hover:bg-primary" ou "hover:scale" SANS
			// le préfixe can-hover: (regex négative ciblée sur les tokens ajoutés).
			expect(className).not.toMatch(/(?:^|\s)hover:bg-primary/);
			expect(className).not.toMatch(/(?:^|\s)hover:text-primary/);
			expect(className).not.toMatch(/(?:^|\s)hover:border-primary/);
			expect(className).not.toMatch(/(?:^|\s)motion-safe:hover:scale/);
		}
	});

	it("nav buttons inherit focus-ring SSOT from Button parent (no naked focus-visible:ring-* override)", () => {
		render(
			<CursorPagination
				perPage={20}
				hasNextPage
				hasPreviousPage
				currentPageSize={20}
				nextCursor="cm1abc2def3ghi4jkl5mnop"
				prevCursor="cm0abc2def3ghi4jkl5mnop"
			/>,
		);

		const buttons = [
			screen.getByLabelText("Retour au début"),
			screen.getByLabelText("Page précédente"),
			screen.getByLabelText("Page suivante"),
		];

		for (const button of buttons) {
			expect(button.className).toContain("focus-ring");
			// Le wrapper PAGINATION_BUTTON_CLASSES ne doit PAS empiler ses propres
			// focus-visible:ring-* (sinon override du focus-ring SSOT du Button).
			expect(button.className).not.toMatch(/focus-visible:ring-2/);
			expect(button.className).not.toMatch(/focus-visible:ring-primary/);
			expect(button.className).not.toMatch(/focus-visible:ring-offset-/);
		}
	});
});
