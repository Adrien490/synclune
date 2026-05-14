import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// IMPORTS
// ============================================================================

import { AutocompleteLiveRegion } from "../autocomplete-live-region";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AutocompleteLiveRegion", () => {
	// ─── ARIA attributes ───────────────────────────────────────────────────

	it("has aria-live='polite'", () => {
		const { container } = render(
			<AutocompleteLiveRegion
				isLoading={false}
				hasResults={false}
				hasValidQuery={false}
				itemCount={0}
			/>,
		);

		const span = container.firstChild as HTMLElement;
		expect(span).toHaveAttribute("aria-live", "polite");
	});

	it("does NOT set aria-atomic (avoids re-announcing full text on rapid transitions)", () => {
		const { container } = render(
			<AutocompleteLiveRegion
				isLoading={false}
				hasResults={false}
				hasValidQuery={false}
				itemCount={0}
			/>,
		);

		const span = container.firstChild as HTMLElement;
		expect(span).not.toHaveAttribute("aria-atomic");
	});

	// ─── Loading state ─────────────────────────────────────────────────────

	it("shows 'Recherche en cours' when isLoading=true", () => {
		render(
			<AutocompleteLiveRegion
				isLoading={true}
				hasResults={false}
				hasValidQuery={true}
				itemCount={0}
			/>,
		);

		expect(screen.getByText("Recherche en cours")).toBeInTheDocument();
	});

	it("loading message takes priority over hasResults", () => {
		render(
			<AutocompleteLiveRegion
				isLoading={true}
				hasResults={true}
				hasValidQuery={true}
				itemCount={5}
			/>,
		);

		expect(screen.getByText("Recherche en cours")).toBeInTheDocument();
	});

	// ─── Results count ─────────────────────────────────────────────────────

	it("shows '1 résultat trouvé' for a single result", () => {
		render(
			<AutocompleteLiveRegion
				isLoading={false}
				hasResults={true}
				hasValidQuery={true}
				itemCount={1}
			/>,
		);

		expect(screen.getByText("1 résultat trouvé")).toBeInTheDocument();
	});

	it("shows '3 résultats trouvés' for multiple results", () => {
		render(
			<AutocompleteLiveRegion
				isLoading={false}
				hasResults={true}
				hasValidQuery={true}
				itemCount={3}
			/>,
		);

		expect(screen.getByText("3 résultats trouvés")).toBeInTheDocument();
	});

	it("shows '2 résultats trouvés' for exactly 2 results", () => {
		render(
			<AutocompleteLiveRegion
				isLoading={false}
				hasResults={true}
				hasValidQuery={true}
				itemCount={2}
			/>,
		);

		expect(screen.getByText("2 résultats trouvés")).toBeInTheDocument();
	});

	// ─── Empty state ───────────────────────────────────────────────────────

	it("shows 'Aucun résultat' when hasValidQuery=true and no results", () => {
		render(
			<AutocompleteLiveRegion
				isLoading={false}
				hasResults={false}
				hasValidQuery={true}
				itemCount={0}
			/>,
		);

		expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
	});

	// ─── No valid query ────────────────────────────────────────────────────

	it("renders empty string when hasValidQuery=false and no results", () => {
		const { container } = render(
			<AutocompleteLiveRegion
				isLoading={false}
				hasResults={false}
				hasValidQuery={false}
				itemCount={0}
			/>,
		);

		const span = container.firstChild as HTMLElement;
		expect(span.textContent).toBe("");
	});
});
