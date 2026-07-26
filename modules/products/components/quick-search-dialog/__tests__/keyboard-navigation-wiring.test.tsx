import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type FC } from "react";

import { useKeyboardNavigation } from "../use-keyboard-navigation";

/**
 * Regression coverage for the quick search keyboard navigation wiring.
 *
 * `useKeyboardNavigation` is unit-tested in isolation in
 * `use-keyboard-navigation.test.ts`. THIS file locks the integration that the
 * unit test cannot see: `handleArrowNavigation` must be bound to the search
 * <input> — not the listbox container — because in `QuickSearchDialog` the
 * input lives in a sibling subtree, so a keydown on the input never bubbles to
 * the listbox. The harness below reproduces that exact sibling relationship.
 */

// MutationObserver mock — observe() triggers the refresh synchronously so the
// hook indexes focusable elements immediately.
class MockMutationObserver {
	private callback: MutationCallback;
	constructor(callback: MutationCallback) {
		this.callback = callback;
	}
	observe() {
		this.callback([], this as unknown as MutationObserver);
	}
	disconnect() {}
	takeRecords(): MutationRecord[] {
		return [];
	}
}
vi.stubGlobal("MutationObserver", MockMutationObserver);
Element.prototype.scrollIntoView = vi.fn();

const optionClicks = { first: vi.fn(), second: vi.fn(), footer: vi.fn() };

/**
 * Mirrors the QuickSearchDialog structure: the <input> carries the keyboard
 * handler and lives in a sibling subtree of the listbox container (`contentRef`).
 */
const Harness: FC = () => {
	const { contentRef, handleArrowNavigation, resetActiveIndex, activeDescendantId } =
		useKeyboardNavigation({ isSearchMode: true });
	return (
		<div>
			<input
				data-testid="search-input"
				role="combobox"
				aria-expanded
				aria-controls="qs-test-listbox"
				aria-activedescendant={activeDescendantId}
				onKeyDown={handleArrowNavigation}
			/>
			<div
				ref={contentRef}
				id="qs-test-listbox"
				role="listbox"
				aria-label="Résultats"
				tabIndex={-1}
				onMouseLeave={resetActiveIndex}
			>
				<a
					href="#result-1"
					role="option"
					data-qs-option=""
					aria-selected={false}
					tabIndex={-1}
					onClick={(e) => {
						e.preventDefault();
						optionClicks.first();
					}}
				>
					Résultat 1
				</a>
				<a
					href="#result-2"
					role="option"
					data-qs-option=""
					aria-selected={false}
					tabIndex={-1}
					onClick={(e) => {
						e.preventDefault();
						optionClicks.second();
					}}
				>
					Résultat 2
				</a>
				<button
					type="button"
					role="option"
					data-qs-option=""
					aria-selected={false}
					tabIndex={-1}
					onClick={() => optionClicks.footer()}
				>
					Voir les résultats
				</button>
			</div>
		</div>
	);
};

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("quick search — keyboard navigation wiring", () => {
	it("ArrowDown on the search input drives the listbox (handler bound to the input, not the sibling listbox)", () => {
		render(<Harness />);
		const input = screen.getByTestId("search-input");

		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant", "qs-nav-0");

		fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input).toHaveAttribute("aria-activedescendant", "qs-nav-1");
	});

	it("ArrowUp moves the active option backwards", () => {
		render(<Harness />);
		const input = screen.getByTestId("search-input");

		fireEvent.keyDown(input, { key: "ArrowDown" }); // qs-nav-0
		fireEvent.keyDown(input, { key: "ArrowDown" }); // qs-nav-1
		fireEvent.keyDown(input, { key: "ArrowUp" });
		expect(input).toHaveAttribute("aria-activedescendant", "qs-nav-0");
	});

	it("Home and End jump to the first and last options", () => {
		render(<Harness />);
		const input = screen.getByTestId("search-input");

		fireEvent.keyDown(input, { key: "End" });
		expect(input).toHaveAttribute("aria-activedescendant", "qs-nav-2");

		fireEvent.keyDown(input, { key: "Home" });
		expect(input).toHaveAttribute("aria-activedescendant", "qs-nav-0");
	});

	it("Enter activates the highlighted option", () => {
		render(<Harness />);
		const input = screen.getByTestId("search-input");

		fireEvent.keyDown(input, { key: "ArrowDown" }); // highlight qs-nav-0
		const notPrevented = fireEvent.keyDown(input, { key: "Enter" });

		expect(optionClicks.first).toHaveBeenCalledOnce();
		// preventDefault was called → the form submit (full-results) is suppressed
		expect(notPrevented).toBe(false);
	});

	it("Enter with no highlighted option activates nothing and lets the form submit through", () => {
		render(<Harness />);
		const input = screen.getByTestId("search-input");

		const notPrevented = fireEvent.keyDown(input, { key: "Enter" });

		expect(optionClicks.first).not.toHaveBeenCalled();
		expect(optionClicks.second).not.toHaveBeenCalled();
		expect(optionClicks.footer).not.toHaveBeenCalled();
		// No preventDefault → the native form submit fires (navigates to full results)
		expect(notPrevented).toBe(true);
	});
});
