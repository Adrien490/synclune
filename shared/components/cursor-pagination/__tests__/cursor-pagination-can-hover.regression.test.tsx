/**
 * @regression cursor-pagination-can-hover
 *
 * Verrouille P1-1 (sticky-hover iOS) puis son épilogue (audit 2026-08-05,
 * direction C) : la couche `PAGINATION_BUTTON_CLASSES` — survol rose
 * translucide, `backdrop-blur` inerte, zoom 1,02, durée 300 ms — a été
 * RETIRÉE. Les états de survol et le focus-ring sont désormais ceux du
 * `<Button variant="outline">` parent, dont les `hover:` sont déjà gatés
 * `can-hover:` à la source.
 *
 * Ce test fige donc deux choses :
 * 1. le composant n'ajoute AUCUNE classe `hover:` en propre (a fortiori
 *    aucune non gatée) — si un survol custom revient, il doit être
 *    `can-hover:hover:*` ET justifié face au registre neutre admin ;
 * 2. la couche supprimée ne réapparaît pas (rose/verre/zoom sur les boutons
 *    de pagination = le costume boutique égaré dans l'outil).
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

vi.mock("@phosphor-icons/react/ssr", () => ({
	CaretLeftIcon: () => <span data-testid="icon-chevron-left" />,
	CaretRightIcon: () => <span data-testid="icon-chevron-right" />,
	CaretDoubleLeftIcon: () => <span data-testid="icon-chevrons-left" />,
	SpinnerIcon: () => <span data-testid="icon-loader" />,
}));

import { CursorPagination } from "../cursor-pagination";

function renderBar() {
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
	return [
		screen.getByLabelText("Retour au début"),
		screen.getByLabelText("Page précédente"),
		screen.getByLabelText("Page suivante"),
	];
}

describe("CursorPagination — sticky-hover regression (P1-1) & registre neutre", () => {
	beforeEach(() => {
		mockSearchParams.current = new URLSearchParams();
	});
	afterEach(cleanup);

	it("adds no hover class of its own — hover states come from Button, already can-hover: gated", () => {
		for (const button of renderBar()) {
			const className = button.className;
			// Les seuls tokens `hover:` autorisés sur ces boutons sont ceux du
			// variant `outline` du Button, tous préfixés `can-hover:`.
			const hoverTokens = className.split(/\s+/).filter((token) => token.includes("hover:"));
			for (const token of hoverTokens) {
				expect(token, `token hover non gaté : ${token}`).toMatch(/^can-hover:/);
			}
		}
	});

	it("the removed boutique layer (rose/blur/scale/300ms) must not come back", () => {
		for (const button of renderBar()) {
			const className = button.className;
			expect(className).not.toMatch(/hover:bg-primary/);
			expect(className).not.toMatch(/hover:text-primary/);
			expect(className).not.toMatch(/hover:border-primary/);
			expect(className).not.toMatch(/backdrop-blur/);
			expect(className).not.toMatch(/hover:scale/);
			expect(className).not.toMatch(/duration-300/);
		}
	});

	it("nav buttons inherit focus-ring SSOT from Button parent (no naked focus-visible:ring-* override)", () => {
		for (const button of renderBar()) {
			expect(button.className).toContain("focus-ring");
			expect(button.className).not.toMatch(/focus-visible:ring-2/);
			expect(button.className).not.toMatch(/focus-visible:ring-primary/);
			expect(button.className).not.toMatch(/focus-visible:ring-offset-/);
		}
	});
});
