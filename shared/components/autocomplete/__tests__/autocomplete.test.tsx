import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMobile, mockMounted } = vi.hoisted(() => ({
	mockIsMobile: { value: false },
	mockMounted: { value: true },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

vi.mock("@/shared/hooks/use-mounted", () => ({
	useMounted: () => mockMounted.value,
}));

vi.mock("motion/react", () => {
	const { createElement, forwardRef } = require("react");

	const m = new Proxy(
		{},
		{
			get: (_target, tag: string) => {
				const Component = forwardRef(
					(
						{
							children,
							initial: _i,
							animate: _a,
							exit: _e,
							transition: _t,
							...props
						}: Record<string, unknown> & { children?: unknown },
						ref: unknown,
					) => createElement(tag, { ref, ...props }, children),
				);
				Component.displayName = `m.${tag}`;
				return Component;
			},
		},
	);

	function AnimatePresence({ children }: { children?: unknown }) {
		return createElement("div", { "data-testid": "animate-presence" }, children);
	}

	function MotionConfig({ children }: { children?: unknown }) {
		return createElement("div", { "data-testid": "motion-config" }, children);
	}

	return { m, AnimatePresence, MotionConfig };
});

vi.mock("next/image", () => {
	const { createElement } = require("react");
	return {
		default: ({
			src,
			alt,
			fill: _fill,
			sizes: _sizes,
			quality: _quality,
			className,
			placeholder: _placeholder,
			blurDataURL: _blurDataURL,
		}: Record<string, unknown>) =>
			createElement("img", { src, alt, className, "data-testid": "next-image" }),
	};
});

vi.mock("@/shared/components/ui/spinner", () => {
	const { createElement } = require("react");
	return {
		Spinner: ({ className }: { className?: string }) =>
			createElement("span", { "data-testid": "spinner", className }),
	};
});

vi.mock("@/shared/components/ui/skeleton", () => {
	const { createElement } = require("react");
	return {
		Skeleton: ({ className, style }: { className?: string; style?: Record<string, unknown> }) =>
			createElement("span", { "data-testid": "skeleton", className, style }),
	};
});

vi.mock("@/shared/components/ui/button", () => {
	const { forwardRef, createElement } = require("react");
	const Button = forwardRef(
		(
			{
				children,
				variant: _v,
				size: _s,
				onClick,
				...props
			}: Record<string, unknown> & { children?: unknown; onClick?: () => void },
			ref: unknown,
		) => createElement("button", { ref, onClick, ...props }, children),
	);
	Button.displayName = "Button";
	return { Button };
});

vi.mock("@/shared/components/ui/empty", () => {
	const { createElement } = require("react");
	return {
		Empty: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "empty" }, children),
		EmptyHeader: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "empty-header" }, children),
		EmptyMedia: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "empty-media" }, children),
		EmptyTitle: ({ children, className }: { children?: unknown; className?: string }) =>
			createElement("p", { "data-testid": "empty-title", className }, children),
		EmptyDescription: ({ children }: { children?: unknown }) =>
			createElement("p", { "data-testid": "empty-description" }, children),
	};
});

vi.mock("lucide-react", () => {
	const { createElement } = require("react");
	return {
		SearchIcon: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "search-icon", ...props }),
		AlertCircleIcon: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "alert-icon", ...props }),
		X: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "x-icon", ...props }),
	};
});

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// Import AFTER mocks
import { Autocomplete } from "../autocomplete";
import { AutocompleteLiveRegion } from "../autocomplete-live-region";
import { useAutocompleteKeyboard } from "../use-autocomplete-keyboard";
import { renderHook } from "@testing-library/react";

// ============================================================================
// TYPES & FIXTURES
// ============================================================================

type TestItem = {
	id: string;
	name: string;
	description: string;
};

const TEST_ITEMS: TestItem[] = [
	{ id: "1", name: "Bague en or", description: "Or 18 carats" },
	{ id: "2", name: "Collier argent", description: "Argent 925" },
	{ id: "3", name: "Boucles dorées", description: "Plaqué or" },
];

const DEFAULT_PROPS = {
	name: "search",
	value: "",
	onChange: vi.fn(),
	onSelect: vi.fn(),
	items: [] as TestItem[],
	getItemLabel: (item: TestItem) => item.name,
	getItemKey: (item: TestItem) => item.id,
	minQueryLength: 2,
	debounceMs: 0,
};

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockIsMobile.value = false;
	mockMounted.value = true;
	Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function renderAutocomplete(props: Partial<typeof DEFAULT_PROPS> & Record<string, unknown> = {}) {
	return render(<Autocomplete {...DEFAULT_PROPS} {...props} />);
}

function getInput() {
	return screen.getByRole("combobox");
}

// ============================================================================
// TESTS: Autocomplete component
// ============================================================================

describe("Autocomplete", () => {
	// --------------------------------------------------------------------------
	// Rendering & ARIA
	// --------------------------------------------------------------------------

	describe("rendering and ARIA attributes", () => {
		it("renders an input with combobox role", () => {
			renderAutocomplete();
			expect(getInput()).toBeInTheDocument();
		});

		it("sets aria-autocomplete='list' on the input", () => {
			renderAutocomplete();
			expect(getInput()).toHaveAttribute("aria-autocomplete", "list");
		});

		it("sets aria-expanded='false' when dropdown is not open", () => {
			renderAutocomplete();
			expect(getInput()).toHaveAttribute("aria-expanded", "false");
		});

		it("sets autocomplete='off' to suppress browser native autocomplete", () => {
			renderAutocomplete();
			expect(getInput()).toHaveAttribute("autocomplete", "off");
		});

		it("forwards aria-invalid to the input", () => {
			renderAutocomplete({ "aria-invalid": true });
			expect(getInput()).toHaveAttribute("aria-invalid", "true");
		});

		it("forwards aria-required to the input", () => {
			renderAutocomplete({ "aria-required": true });
			expect(getInput()).toHaveAttribute("aria-required", "true");
		});

		it("forwards aria-describedby to the input", () => {
			renderAutocomplete({ "aria-describedby": "external-hint" });
			expect(getInput()).toHaveAttribute("aria-describedby", "external-hint");
		});

		it("renders search icon by default", () => {
			renderAutocomplete();
			expect(screen.getByTestId("search-icon")).toBeInTheDocument();
		});

		it("does not render search icon when showSearchIcon=false", () => {
			renderAutocomplete({ showSearchIcon: false });
			expect(screen.queryByTestId("search-icon")).not.toBeInTheDocument();
		});

		it("passes the name prop to the input", () => {
			renderAutocomplete({ name: "my-search" });
			expect(getInput()).toHaveAttribute("name", "my-search");
		});

		it("passes the placeholder prop to the input", () => {
			renderAutocomplete({ placeholder: "Chercher..." });
			expect(getInput()).toHaveAttribute("placeholder", "Chercher...");
		});

		it("disables the input when disabled=true", () => {
			renderAutocomplete({ disabled: true });
			expect(getInput()).toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// minQueryLength hint
	// --------------------------------------------------------------------------

	describe("minQueryLength hint", () => {
		it("shows hint when query is shorter than minQueryLength", () => {
			renderAutocomplete({ value: "a", minQueryLength: 3 });
			expect(screen.getByText(/Tapez encore 2 caractères/)).toBeInTheDocument();
		});

		it("shows singular form when only 1 character remaining", () => {
			renderAutocomplete({ value: "a", minQueryLength: 2 });
			expect(screen.getByText(/Tapez encore 1 caractère$/)).toBeInTheDocument();
		});

		it("does not show hint when query is empty", () => {
			renderAutocomplete({ value: "", minQueryLength: 2 });
			expect(screen.queryByText(/Tapez encore/)).not.toBeInTheDocument();
		});

		it("does not show hint when query meets minQueryLength", () => {
			renderAutocomplete({ value: "ab", minQueryLength: 2 });
			expect(screen.queryByText(/Tapez encore/)).not.toBeInTheDocument();
		});

		it("includes hintId in aria-describedby when hint is visible", () => {
			renderAutocomplete({ value: "a", minQueryLength: 3 });
			const input = getInput();
			const describedBy = input.getAttribute("aria-describedby") ?? "";
			// The hint paragraph should exist in the DOM with that id
			const hintEl = document.getElementById(describedBy.split(" ")[0]!);
			expect(hintEl).toBeInTheDocument();
			expect(hintEl?.textContent).toMatch(/Tapez encore/);
		});

		it("combines hintId and external aria-describedby", () => {
			renderAutocomplete({ value: "a", minQueryLength: 3, "aria-describedby": "external" });
			const describedBy = getInput().getAttribute("aria-describedby") ?? "";
			expect(describedBy).toContain("external");
			// Also contains the hint id
			const ids = describedBy.split(" ");
			expect(ids.length).toBe(2);
		});
	});

	// --------------------------------------------------------------------------
	// Dropdown visibility
	// --------------------------------------------------------------------------

	describe("dropdown visibility", () => {
		it("does not show listbox when query < minQueryLength", () => {
			renderAutocomplete({ value: "a", minQueryLength: 3, items: TEST_ITEMS });
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});

		it("does not show listbox when there is no content (no items, not loading, no error)", () => {
			renderAutocomplete({ value: "ab", items: [], isLoading: false, showEmptyState: false });
			// Must focus first to open
			fireEvent.focus(getInput());
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});

		it("shows listbox when query >= minQueryLength and items exist after focus", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();
		});

		it("shows listbox with aria-label 'Résultats de recherche'", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox", { name: "Résultats de recherche" })).toBeInTheDocument();
		});

		it("sets aria-expanded='true' when dropdown is open", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(getInput()).toHaveAttribute("aria-expanded", "true");
		});

		it("sets aria-controls pointing to the listbox when open", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			const controlsId = getInput().getAttribute("aria-controls");
			expect(controlsId).toBeTruthy();
			expect(document.getElementById(controlsId!)).toBe(screen.getByRole("listbox"));
		});

		it("does not set aria-controls when dropdown is closed", () => {
			renderAutocomplete({ value: "" });
			expect(getInput()).not.toHaveAttribute("aria-controls");
		});

		it("shows listbox when isLoading=true and query is valid", () => {
			renderAutocomplete({ value: "ba", items: [], isLoading: true });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();
		});

		it("shows listbox when error is provided and query is valid", () => {
			renderAutocomplete({ value: "ba", items: [], error: "Erreur réseau" });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();
		});

		it("shows listbox when showEmptyState=true and no results", () => {
			renderAutocomplete({ value: "ba", items: [], showEmptyState: true });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// onChange and debounce
	// --------------------------------------------------------------------------

	describe("onChange and debounce", () => {
		it("calls onChange immediately when debounceMs=0", () => {
			const onChange = vi.fn();
			renderAutocomplete({ onChange, debounceMs: 0 });
			fireEvent.change(getInput(), { target: { value: "ba" } });
			expect(onChange).toHaveBeenCalledWith("ba");
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it("does not call onChange immediately when debounceMs > 0", () => {
			vi.useFakeTimers();
			const onChange = vi.fn();
			renderAutocomplete({ onChange, debounceMs: 300 });
			fireEvent.change(getInput(), { target: { value: "ba" } });
			expect(onChange).not.toHaveBeenCalled();
		});

		it("calls onChange after debounce delay", () => {
			vi.useFakeTimers();
			const onChange = vi.fn();
			renderAutocomplete({ onChange, debounceMs: 300 });
			fireEvent.change(getInput(), { target: { value: "ba" } });
			act(() => {
				vi.advanceTimersByTime(300);
			});
			expect(onChange).toHaveBeenCalledWith("ba");
		});

		it("debounces multiple rapid changes into a single call", () => {
			vi.useFakeTimers();
			const onChange = vi.fn();
			renderAutocomplete({ onChange, debounceMs: 300 });
			fireEvent.change(getInput(), { target: { value: "b" } });
			fireEvent.change(getInput(), { target: { value: "ba" } });
			fireEvent.change(getInput(), { target: { value: "bag" } });
			act(() => {
				vi.advanceTimersByTime(300);
			});
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith("bag");
		});

		it("shows input value immediately regardless of debounce", () => {
			vi.useFakeTimers();
			renderAutocomplete({ debounceMs: 300 });
			fireEvent.change(getInput(), { target: { value: "ba" } });
			expect(getInput()).toHaveValue("ba");
		});
	});

	// --------------------------------------------------------------------------
	// Loading state
	// --------------------------------------------------------------------------

	describe("loading state", () => {
		it("announces 'Recherche en cours' via live region when isLoading=true", () => {
			// The Spinner is passed as endIcon to Input, but due to Input's internal rendering
			// logic the spinner is not always visible in DOM. The live region is the reliable
			// indicator that loading is active and accessible.
			renderAutocomplete({ isLoading: true, value: "ba" });
			const liveRegion = document.querySelector("[aria-live='polite']");
			expect(liveRegion?.textContent).toBe("Recherche en cours");
		});

		it("does not announce loading when isLoading=false", () => {
			renderAutocomplete({ isLoading: false, value: "ba" });
			const liveRegion = document.querySelector("[aria-live='polite']");
			expect(liveRegion?.textContent).not.toBe("Recherche en cours");
		});

		it("shows loading skeletons in dropdown when isLoading=true and query is valid", () => {
			renderAutocomplete({ value: "ba", items: [], isLoading: true, loadingSkeletonCount: 3 });
			fireEvent.focus(getInput());
			const skeletons = screen.getAllByTestId("skeleton");
			// Each skeleton row has at least a label skeleton
			expect(skeletons.length).toBeGreaterThanOrEqual(3);
		});

		it("shows the correct number of skeleton rows based on loadingSkeletonCount", () => {
			renderAutocomplete({ value: "ba", items: [], isLoading: true, loadingSkeletonCount: 2 });
			fireEvent.focus(getInput());
			// Each row has at least 1 skeleton (the label), so there are at least 2
			const listItems = screen.getByRole("listbox").querySelectorAll("li");
			expect(listItems.length).toBe(2);
		});
	});

	// --------------------------------------------------------------------------
	// Error state
	// --------------------------------------------------------------------------

	describe("error state", () => {
		it("shows error message in dropdown", () => {
			renderAutocomplete({ value: "ba", items: [], error: "Erreur réseau" });
			fireEvent.focus(getInput());
			expect(screen.getByTestId("empty-title")).toHaveTextContent("Erreur réseau");
		});

		it("shows retry button when onRetry is provided", () => {
			const onRetry = vi.fn();
			renderAutocomplete({ value: "ba", items: [], error: "Erreur", onRetry });
			fireEvent.focus(getInput());
			expect(screen.getByRole("button", { name: /Réessayer/i })).toBeInTheDocument();
		});

		it("calls onRetry when retry button is clicked", () => {
			const onRetry = vi.fn();
			renderAutocomplete({ value: "ba", items: [], error: "Erreur", onRetry });
			fireEvent.focus(getInput());
			fireEvent.click(screen.getByRole("button", { name: /Réessayer/i }));
			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it("does not show retry button when onRetry is not provided", () => {
			renderAutocomplete({ value: "ba", items: [], error: "Erreur" });
			fireEvent.focus(getInput());
			expect(screen.queryByRole("button", { name: /Réessayer/i })).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Empty state
	// --------------------------------------------------------------------------

	describe("empty state", () => {
		it("shows empty state when showEmptyState=true and no results", () => {
			renderAutocomplete({ value: "ba", items: [], showEmptyState: true });
			fireEvent.focus(getInput());
			expect(screen.getByTestId("empty")).toBeInTheDocument();
		});

		it("shows the noResultsMessage in empty state", () => {
			renderAutocomplete({
				value: "ba",
				items: [],
				showEmptyState: true,
				noResultsMessage: "Rien trouvé",
			});
			fireEvent.focus(getInput());
			expect(screen.getByTestId("empty-title")).toHaveTextContent("Rien trouvé");
		});

		it("does not show empty state when showEmptyState=false", () => {
			renderAutocomplete({ value: "ba", items: [], showEmptyState: false });
			fireEvent.focus(getInput());
			expect(screen.queryByTestId("empty")).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Items rendering
	// --------------------------------------------------------------------------

	describe("items rendering", () => {
		it("renders items with role='option'", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getAllByRole("option")).toHaveLength(TEST_ITEMS.length);
		});

		it("renders item labels", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getByText("Bague en or")).toBeInTheDocument();
			expect(screen.getByText("Collier argent")).toBeInTheDocument();
			expect(screen.getByText("Boucles dorées")).toBeInTheDocument();
		});

		it("sets aria-posinset on each item (1-based)", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			const options = screen.getAllByRole("option");
			expect(options[0]).toHaveAttribute("aria-posinset", "1");
			expect(options[1]).toHaveAttribute("aria-posinset", "2");
			expect(options[2]).toHaveAttribute("aria-posinset", "3");
		});

		it("sets aria-setsize equal to the total item count", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			screen
				.getAllByRole("option")
				.forEach((opt) => expect(opt).toHaveAttribute("aria-setsize", "3"));
		});

		it("sets aria-selected='false' by default for all items", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			screen
				.getAllByRole("option")
				.forEach((opt) => expect(opt).toHaveAttribute("aria-selected", "false"));
		});

		it("renders item descriptions when getItemDescription is provided", () => {
			renderAutocomplete({
				value: "ba",
				items: TEST_ITEMS,
				getItemDescription: (item: TestItem) => item.description,
			});
			fireEvent.focus(getInput());
			expect(screen.getByText("Or 18 carats")).toBeInTheDocument();
		});

		it("shows results count when showResultsCount=true", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS, showResultsCount: true });
			fireEvent.focus(getInput());
			expect(screen.getByText("3 résultats")).toBeInTheDocument();
		});

		it("does not show results count when showResultsCount=false", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS, showResultsCount: false });
			fireEvent.focus(getInput());
			expect(screen.queryByText("3 résultats")).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// onSelect
	// --------------------------------------------------------------------------

	describe("onSelect", () => {
		it("calls onSelect when an item is clicked", () => {
			const onSelect = vi.fn();
			renderAutocomplete({ value: "ba", items: TEST_ITEMS, onSelect });
			fireEvent.focus(getInput());
			fireEvent.click(screen.getAllByRole("option")[0]!);
			expect(onSelect).toHaveBeenCalledWith(TEST_ITEMS[0]);
		});

		it("closes the dropdown after item selection", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();
			fireEvent.click(screen.getAllByRole("option")[0]!);
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});

		it("does not call onSelect when clicking on the results count row", () => {
			const onSelect = vi.fn();
			renderAutocomplete({
				value: "ba",
				items: TEST_ITEMS,
				onSelect,
				showResultsCount: true,
			});
			fireEvent.focus(getInput());
			// The presentation li should not trigger onSelect
			const countRow = screen.getByRole("presentation");
			fireEvent.click(countRow);
			expect(onSelect).not.toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// Clear button
	// --------------------------------------------------------------------------

	describe("clear button", () => {
		it("shows clear button when value is non-empty and showClearButton=true", () => {
			renderAutocomplete({ value: "ab", showClearButton: true });
			expect(screen.getByRole("button", { name: /Effacer/i })).toBeInTheDocument();
		});

		it("does not show clear button when value is empty", () => {
			renderAutocomplete({ value: "", showClearButton: true });
			expect(screen.queryByRole("button", { name: /Effacer/i })).not.toBeInTheDocument();
		});

		it("calls onChange with empty string when clear button is clicked", () => {
			const onChange = vi.fn();
			renderAutocomplete({ value: "ab", onChange, showClearButton: true });
			fireEvent.click(screen.getByRole("button", { name: /Effacer/i }));
			expect(onChange).toHaveBeenCalledWith("");
		});

		it("closes the dropdown when clear button is clicked", () => {
			renderAutocomplete({ value: "ab", items: TEST_ITEMS, showClearButton: true });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();
			fireEvent.click(screen.getByRole("button", { name: /Effacer/i }));
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Keyboard navigation: aria-activedescendant
	// --------------------------------------------------------------------------

	describe("aria-activedescendant", () => {
		it("is not set when no item is active", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(getInput()).not.toHaveAttribute("aria-activedescendant");
		});

		it("is set to the active item id after ArrowDown", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			const activedescendant = getInput().getAttribute("aria-activedescendant");
			expect(activedescendant).toBeTruthy();
			// The item with that id should be in the DOM
			expect(document.getElementById(activedescendant!)).toBeInTheDocument();
		});

		it("updates aria-activedescendant when navigating to next item", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			const firstActiveId = getInput().getAttribute("aria-activedescendant");

			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			const secondActiveId = getInput().getAttribute("aria-activedescendant");

			expect(firstActiveId).not.toBe(secondActiveId);
		});

		it("clears aria-activedescendant after Escape", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			expect(getInput()).toHaveAttribute("aria-activedescendant");

			fireEvent.keyDown(getInput(), { key: "Escape" });
			expect(getInput()).not.toHaveAttribute("aria-activedescendant");
		});
	});

	// --------------------------------------------------------------------------
	// Keyboard navigation: dropdown control
	// --------------------------------------------------------------------------

	describe("keyboard navigation", () => {
		it("closes dropdown on Escape", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();

			fireEvent.keyDown(getInput(), { key: "Escape" });
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});

		it("closes dropdown on Tab", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();

			fireEvent.keyDown(getInput(), { key: "Tab" });
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});

		it("selects active item on Enter and closes dropdown", () => {
			const onSelect = vi.fn();
			renderAutocomplete({ value: "ba", items: TEST_ITEMS, onSelect });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			fireEvent.keyDown(getInput(), { key: "Enter" });

			expect(onSelect).toHaveBeenCalledWith(TEST_ITEMS[0]);
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});

		it("does not call onSelect on Enter when no item is active", () => {
			const onSelect = vi.fn();
			renderAutocomplete({ value: "ba", items: TEST_ITEMS, onSelect });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "Enter" });

			expect(onSelect).not.toHaveBeenCalled();
		});

		it("moves to first item on Home key", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			// Navigate to second item first
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			// Then go Home
			fireEvent.keyDown(getInput(), { key: "Home" });

			const activeId = getInput().getAttribute("aria-activedescendant");
			// Should correspond to first item
			const options = screen.getAllByRole("option");
			expect(options[0]).toHaveAttribute("id", activeId);
		});

		it("moves to last item on End key", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "End" });

			const activeId = getInput().getAttribute("aria-activedescendant");
			const options = screen.getAllByRole("option");
			expect(options[options.length - 1]).toHaveAttribute("id", activeId);
		});

		it("marks the active item with aria-selected='true'", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });

			const options = screen.getAllByRole("option");
			expect(options[0]).toHaveAttribute("aria-selected", "true");
			expect(options[1]).toHaveAttribute("aria-selected", "false");
		});

		it("opens dropdown with ArrowDown when closed and query is valid", () => {
			// Render with valid query but without focus (dropdown closed)
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			// Input is not focused, dropdown is closed
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			expect(screen.getByRole("listbox")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// scrollIntoView
	// --------------------------------------------------------------------------

	describe("scrollIntoView", () => {
		it("calls scrollIntoView when active index changes", () => {
			renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			fireEvent.keyDown(getInput(), { key: "ArrowDown" });
			expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// External value sync
	// --------------------------------------------------------------------------

	describe("external value sync", () => {
		it("reflects external value changes in the input", () => {
			const { rerender } = renderAutocomplete({ value: "ba" });
			expect(getInput()).toHaveValue("ba");

			rerender(<Autocomplete {...DEFAULT_PROPS} value="bague" />);
			expect(getInput()).toHaveValue("bague");
		});

		it("closes dropdown when external value is cleared", () => {
			const { rerender } = renderAutocomplete({ value: "ba", items: TEST_ITEMS });
			fireEvent.focus(getInput());
			expect(screen.getByRole("listbox")).toBeInTheDocument();

			rerender(<Autocomplete {...DEFAULT_PROPS} value="" items={[]} />);
			expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		});
	});
});

// ============================================================================
// TESTS: AutocompleteLiveRegion
// ============================================================================

describe("AutocompleteLiveRegion", () => {
	function renderRegion(props: {
		isLoading?: boolean;
		hasResults?: boolean;
		hasValidQuery?: boolean;
		itemCount?: number;
	}) {
		const defaults = {
			isLoading: false,
			hasResults: false,
			hasValidQuery: false,
			itemCount: 0,
		};
		return render(<AutocompleteLiveRegion {...defaults} {...props} />);
	}

	it("has aria-live='polite'", () => {
		renderRegion({});
		expect(screen.getByText("", { selector: "[aria-live]" })).toHaveAttribute(
			"aria-live",
			"polite",
		);
	});

	it("has aria-atomic='true'", () => {
		renderRegion({});
		const el = document.querySelector("[aria-live]");
		expect(el).toHaveAttribute("aria-atomic", "true");
	});

	it("has sr-only class for visual hiding", () => {
		renderRegion({});
		const el = document.querySelector("[aria-live]");
		expect(el?.className).toContain("sr-only");
	});

	it("shows 'Recherche en cours' when isLoading=true", () => {
		renderRegion({ isLoading: true, hasValidQuery: true, hasResults: false });
		expect(document.querySelector("[aria-live]")?.textContent).toBe("Recherche en cours");
	});

	it("shows single result message when itemCount=1", () => {
		renderRegion({ isLoading: false, hasResults: true, hasValidQuery: true, itemCount: 1 });
		expect(document.querySelector("[aria-live]")?.textContent).toBe("1 résultat trouvé");
	});

	it("shows plural results message when itemCount > 1", () => {
		renderRegion({ isLoading: false, hasResults: true, hasValidQuery: true, itemCount: 3 });
		expect(document.querySelector("[aria-live]")?.textContent).toBe("3 résultats trouvés");
	});

	it("shows 'Aucun résultat' when hasValidQuery=true and no results", () => {
		renderRegion({ isLoading: false, hasResults: false, hasValidQuery: true, itemCount: 0 });
		expect(document.querySelector("[aria-live]")?.textContent).toBe("Aucun résultat");
	});

	it("shows empty string when hasValidQuery=false and no results", () => {
		renderRegion({ isLoading: false, hasResults: false, hasValidQuery: false, itemCount: 0 });
		expect(document.querySelector("[aria-live]")?.textContent).toBe("");
	});

	it("prioritizes isLoading over hasResults", () => {
		renderRegion({ isLoading: true, hasResults: true, hasValidQuery: true, itemCount: 5 });
		expect(document.querySelector("[aria-live]")?.textContent).toBe("Recherche en cours");
	});
});

// ============================================================================
// TESTS: useAutocompleteKeyboard
// ============================================================================

describe("useAutocompleteKeyboard", () => {
	function createKeyboardEvent(
		key: string,
		extra: Partial<KeyboardEvent> = {},
	): React.KeyboardEvent {
		const event = {
			key,
			preventDefault: vi.fn(),
			...extra,
		} as unknown as React.KeyboardEvent;
		return event;
	}

	function buildParams<T>(
		overrides: Partial<Parameters<typeof useAutocompleteKeyboard<T>>[0]> = {},
	) {
		const defaults = {
			isOpen: true,
			hasValidQuery: true,
			hasResults: true,
			items: TEST_ITEMS as unknown as T[],
			activeIndex: -1,
			setIsOpen: vi.fn(),
			setActiveIndex: vi.fn(),
			onSelect: vi.fn(),
		};
		return { ...defaults, ...overrides };
	}

	// --- ArrowDown ---

	it("ArrowDown when closed and has valid query + results: opens dropdown and selects first item", () => {
		const params = buildParams({ isOpen: false });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowDown");

		result.current(event);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(params.setIsOpen).toHaveBeenCalledWith(true);
		expect(params.setActiveIndex).toHaveBeenCalledWith(0);
	});

	it("ArrowDown when closed but no results: does nothing", () => {
		const params = buildParams({ isOpen: false, hasResults: false });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowDown");

		result.current(event);

		expect(params.setIsOpen).not.toHaveBeenCalled();
		expect(params.setActiveIndex).not.toHaveBeenCalled();
	});

	it("ArrowDown when closed but query invalid: does nothing", () => {
		const params = buildParams({ isOpen: false, hasValidQuery: false });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowDown");

		result.current(event);

		expect(params.setIsOpen).not.toHaveBeenCalled();
		expect(params.setActiveIndex).not.toHaveBeenCalled();
	});

	it("ArrowDown when open: moves to next item and calls preventDefault", () => {
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, activeIndex: 0, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowDown");

		result.current(event);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(setActiveIndex).toHaveBeenCalledWith(expect.any(Function));
		// Simulate the updater function
		const updater = setActiveIndex.mock.calls[0]![0] as (prev: number) => number;
		expect(updater(0)).toBe(1);
	});

	it("ArrowDown when open at last item: stays at last item", () => {
		const setActiveIndex = vi.fn();
		const params = buildParams({
			isOpen: true,
			activeIndex: TEST_ITEMS.length - 1,
			setActiveIndex,
		});
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowDown");

		result.current(event);

		const updater = setActiveIndex.mock.calls[0]![0] as (prev: number) => number;
		expect(updater(TEST_ITEMS.length - 1)).toBe(TEST_ITEMS.length - 1);
	});

	// --- ArrowUp ---

	it("ArrowUp when open: moves to previous item and calls preventDefault", () => {
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, activeIndex: 1, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowUp");

		result.current(event);

		expect(event.preventDefault).toHaveBeenCalled();
		const updater = setActiveIndex.mock.calls[0]![0] as (prev: number) => number;
		expect(updater(1)).toBe(0);
	});

	it("ArrowUp at index 0: goes to -1 (no selection)", () => {
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, activeIndex: 0, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowUp");

		result.current(event);

		const updater = setActiveIndex.mock.calls[0]![0] as (prev: number) => number;
		expect(updater(0)).toBe(-1);
	});

	it("ArrowUp at -1: stays at -1", () => {
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, activeIndex: -1, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("ArrowUp");

		result.current(event);

		const updater = setActiveIndex.mock.calls[0]![0] as (prev: number) => number;
		expect(updater(-1)).toBe(-1);
	});

	// --- Home ---

	it("Home: sets activeIndex to 0 and calls preventDefault", () => {
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, activeIndex: 2, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("Home");

		result.current(event);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(setActiveIndex).toHaveBeenCalledWith(0);
	});

	// --- End ---

	it("End: sets activeIndex to last item index and calls preventDefault", () => {
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, activeIndex: 0, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("End");

		result.current(event);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(setActiveIndex).toHaveBeenCalledWith(TEST_ITEMS.length - 1);
	});

	// --- Enter ---

	it("Enter with active item: selects item, closes dropdown, clears index", () => {
		const onSelect = vi.fn();
		const setIsOpen = vi.fn();
		const setActiveIndex = vi.fn();
		const params = buildParams({
			isOpen: true,
			activeIndex: 1,
			onSelect,
			setIsOpen,
			setActiveIndex,
		});
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("Enter");

		result.current(event);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(onSelect).toHaveBeenCalledWith(TEST_ITEMS[1]);
		expect(setIsOpen).toHaveBeenCalledWith(false);
		expect(setActiveIndex).toHaveBeenCalledWith(-1);
	});

	it("Enter with no active item (index -1): does nothing", () => {
		const onSelect = vi.fn();
		const setIsOpen = vi.fn();
		const params = buildParams({ isOpen: true, activeIndex: -1, onSelect, setIsOpen });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("Enter");

		result.current(event);

		expect(onSelect).not.toHaveBeenCalled();
		expect(setIsOpen).not.toHaveBeenCalled();
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	// --- Escape ---

	it("Escape: closes dropdown, clears index, calls preventDefault", () => {
		const setIsOpen = vi.fn();
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, setIsOpen, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("Escape");

		result.current(event);

		expect(event.preventDefault).toHaveBeenCalled();
		expect(setIsOpen).toHaveBeenCalledWith(false);
		expect(setActiveIndex).toHaveBeenCalledWith(-1);
	});

	// --- Tab ---

	it("Tab: closes dropdown and clears index without preventing default", () => {
		const setIsOpen = vi.fn();
		const setActiveIndex = vi.fn();
		const params = buildParams({ isOpen: true, setIsOpen, setActiveIndex });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("Tab");

		result.current(event);

		expect(setIsOpen).toHaveBeenCalledWith(false);
		expect(setActiveIndex).toHaveBeenCalledWith(-1);
		// Tab does NOT prevent default (to allow natural focus movement)
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	// --- Other keys ---

	it("unrelated keys when open: do nothing", () => {
		const setIsOpen = vi.fn();
		const setActiveIndex = vi.fn();
		const onSelect = vi.fn();
		const params = buildParams({ isOpen: true, setIsOpen, setActiveIndex, onSelect });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));
		const event = createKeyboardEvent("a");

		result.current(event);

		expect(setIsOpen).not.toHaveBeenCalled();
		expect(setActiveIndex).not.toHaveBeenCalled();
		expect(onSelect).not.toHaveBeenCalled();
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	it("unrelated keys when closed: do nothing", () => {
		const setIsOpen = vi.fn();
		const params = buildParams({ isOpen: false, setIsOpen });
		const { result } = renderHook(() => useAutocompleteKeyboard(params));

		result.current(createKeyboardEvent("Enter"));
		result.current(createKeyboardEvent("Escape"));

		expect(setIsOpen).not.toHaveBeenCalled();
	});
});
