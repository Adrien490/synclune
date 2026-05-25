import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockResizeObserver {
	constructor(_callback: ResizeObserverCallback) {}
	observe = mockObserve;
	unobserve = vi.fn();
	disconnect = mockDisconnect;
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { TableScrollContainer } from "../table-scroll-container";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("TableScrollContainer", () => {
	// ─── Rendering ────────────────────────────────────────────────────────

	it("renders children inside a role='region' with correct aria-label", () => {
		render(
			<TableScrollContainer>
				<table>
					<tbody>
						<tr>
							<td>Cell content</td>
						</tr>
					</tbody>
				</table>
			</TableScrollContainer>,
		);

		const region = screen.getByRole("region", { name: "Tableau avec scroll horizontal" });
		expect(region).toBeInTheDocument();
		expect(region).toHaveTextContent("Cell content");
	});

	it("uses provided label as aria-label on the scroll region", () => {
		render(
			<TableScrollContainer label="Liste des commandes">
				<span>content</span>
			</TableScrollContainer>,
		);

		expect(screen.getByRole("region", { name: "Liste des commandes" })).toBeInTheDocument();
		// Default fallback should NOT match
		expect(
			screen.queryByRole("region", { name: "Tableau avec scroll horizontal" }),
		).not.toBeInTheDocument();
	});

	it("scroll region has tabIndex 0", () => {
		render(
			<TableScrollContainer>
				<span>content</span>
			</TableScrollContainer>,
		);

		const region = screen.getByRole("region", { name: "Tableau avec scroll horizontal" });
		expect(region).toHaveAttribute("tabindex", "0");
	});

	// ─── Accessibility ────────────────────────────────────────────────────

	it("sr-only scroll hint is not shown by default when no overflow", () => {
		render(
			<TableScrollContainer>
				<span>content</span>
			</TableScrollContainer>,
		);

		// canScrollLeft and canScrollRight are both false when scrollLeft=0, scrollWidth=clientWidth
		// jsdom defaults all to 0 so no overflow → sr-only message should not be present
		expect(
			screen.queryByText("Faites défiler horizontalement pour voir plus de colonnes"),
		).not.toBeInTheDocument();
	});

	it("gradient indicators have aria-hidden='true'", () => {
		const { container } = render(
			<TableScrollContainer>
				<span>content</span>
			</TableScrollContainer>,
		);

		const hiddenDivs = container.querySelectorAll("[aria-hidden='true']");
		expect(hiddenDivs).toHaveLength(2);
	});

	// ─── Cleanup ──────────────────────────────────────────────────────────

	it("disconnects ResizeObserver on unmount", () => {
		const { unmount } = render(
			<TableScrollContainer>
				<span>content</span>
			</TableScrollContainer>,
		);

		unmount();
		expect(mockDisconnect).toHaveBeenCalledOnce();
	});

	it("removes scroll and resize event listeners on unmount", () => {
		const addSpy = vi.spyOn(window, "addEventListener");
		const removeSpy = vi.spyOn(window, "removeEventListener");

		const { unmount } = render(
			<TableScrollContainer>
				<span>content</span>
			</TableScrollContainer>,
		);

		unmount();

		const addedResize = addSpy.mock.calls.find(([type]) => String(type) === "resize");
		expect(addedResize).toBeDefined();

		const removedResize = removeSpy.mock.calls.find(([type]) => String(type) === "resize");
		expect(removedResize).toBeDefined();
	});
});
