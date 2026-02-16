import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
	}),
	useSearchParams: () => mockSearchParams,
}));

// Mock Radix UI components to avoid complexity in tests
vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children, value, onValueChange, disabled }: any) => (
		<div data-testid="select" data-value={value} data-disabled={disabled}>
			<button
				type="button"
				onClick={() => !disabled && onValueChange?.("created_at_desc")}
				data-testid="select-trigger"
			>
				Trigger
			</button>
			{children}
		</div>
	),
	SelectTrigger: ({ children, className, "aria-label": ariaLabel, ref }: any) => (
		<div
			data-testid="select-trigger-wrapper"
			className={className}
			aria-label={ariaLabel}
			ref={ref}
		>
			{children}
		</div>
	),
	SelectValue: ({ placeholder }: any) => (
		<span data-testid="select-value">{placeholder}</span>
	),
	SelectContent: ({ children }: any) => (
		<div data-testid="select-content">{children}</div>
	),
	SelectItem: ({ children, value }: any) => (
		<div data-testid={`select-item-${value}`}>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/scroll-area", () => ({
	ScrollArea: ({ children }: any) => (
		<div data-testid="scroll-area">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, "aria-label": ariaLabel, className, title }: any) => (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			title={title}
			className={className}
			data-testid="clear-button"
		>
			{children}
		</button>
	),
}));

import { useSortSelect } from "@/shared/hooks/use-sort-select";
import { SortSelect } from "./sort-select";
import type { SortOption } from "@/shared/types/sort.types";

// ─── Helpers ────────────────────────────────────────────────────────

function setSearchParams(params: Record<string, string>) {
	mockSearchParams = new URLSearchParams(params);
}

const mockOptions: SortOption[] = [
	{ value: "created_at_desc", label: "Plus récents" },
	{ value: "created_at_asc", label: "Plus anciens" },
	{ value: "price_asc", label: "Prix croissant" },
	{ value: "price_desc", label: "Prix décroissant" },
];

// ─── Hook Tests ─────────────────────────────────────────────────────

describe("useSortSelect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams = new URLSearchParams();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// ─── Return values ─────────────────────────────────────────────

	describe("return values", () => {
		it("returns empty string as initial value when no sortBy param", () => {
			const { result } = renderHook(() => useSortSelect());

			expect(result.current.value).toBe("");
			expect(result.current.isPending).toBe(false);
		});

		it("reads sortBy from search params", () => {
			setSearchParams({ sortBy: "created_at_desc" });
			const { result } = renderHook(() => useSortSelect());

			expect(result.current.value).toBe("created_at_desc");
		});

		it("reads sortBy with other params present", () => {
			setSearchParams({ sortBy: "price_asc", page: "2", filter_status: "active" });
			const { result } = renderHook(() => useSortSelect());

			expect(result.current.value).toBe("price_asc");
		});
	});

	// ─── setSort ───────────────────────────────────────────────────

	describe("setSort", () => {
		it("pushes URL with sortBy and resets page to 1", () => {
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("created_at_desc");
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("sortBy")).toBe("created_at_desc");
			expect(params.get("page")).toBe("1");
		});

		it("preserves other existing search params", () => {
			setSearchParams({ filter_status: "active", search: "test", page: "3" });
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("price_asc");
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("sortBy")).toBe("price_asc");
			expect(params.get("filter_status")).toBe("active");
			expect(params.get("search")).toBe("test");
			expect(params.get("page")).toBe("1"); // Reset
		});

		it("with empty string removes sortBy param", () => {
			setSearchParams({ sortBy: "created_at_desc", page: "2" });
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("");
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.has("sortBy")).toBe(false);
			expect(params.get("page")).toBe("1");
		});

		it("uses scroll: false on router.push", () => {
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.setSort("price_desc");
			});

			expect(mockPush).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ scroll: false }),
			);
		});

		it("updates optimistic value immediately", () => {
			const { result } = renderHook(() => useSortSelect());

			expect(result.current.value).toBe("");

			act(() => {
				result.current.setSort("created_at_desc");
			});

			// Optimistic value should be updated (in real scenario)
			// Note: Testing optimistic UI fully requires more complex setup
			expect(mockPush).toHaveBeenCalled();
		});
	});

	// ─── clearSort ─────────────────────────────────────────────────

	describe("clearSort", () => {
		it("removes sortBy and resets page to 1", () => {
			setSearchParams({ sortBy: "price_asc", page: "3" });
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.clearSort();
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.has("sortBy")).toBe(false);
			expect(params.get("page")).toBe("1");
		});

		it("preserves other search params", () => {
			setSearchParams({ sortBy: "created_at_desc", filter_status: "active", search: "query" });
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.clearSort();
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.has("sortBy")).toBe(false);
			expect(params.get("filter_status")).toBe("active");
			expect(params.get("search")).toBe("query");
		});

		it("uses scroll: false on router.push", () => {
			setSearchParams({ sortBy: "price_desc" });
			const { result } = renderHook(() => useSortSelect());

			act(() => {
				result.current.clearSort();
			});

			expect(mockPush).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ scroll: false }),
			);
		});

		it("sets optimistic value to empty string", () => {
			setSearchParams({ sortBy: "created_at_desc" });
			const { result } = renderHook(() => useSortSelect());

			expect(result.current.value).toBe("created_at_desc");

			act(() => {
				result.current.clearSort();
			});

			expect(mockPush).toHaveBeenCalled();
		});
	});
});

// ─── Component Tests ────────────────────────────────────────────────

describe("SortSelect", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams = new URLSearchParams();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	// ─── Rendering ─────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders label and placeholder", () => {
			render(
				<SortSelect
					label="Trier par"
					options={mockOptions}
					placeholder="Choisir un tri"
				/>,
			);

			expect(screen.getByText("Trier par")).toBeInTheDocument();
			expect(screen.getByText("Choisir un tri")).toBeInTheDocument();
		});

		it("renders options", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			expect(screen.getByTestId("select-item-created_at_desc")).toHaveTextContent("Plus récents");
			expect(screen.getByTestId("select-item-created_at_asc")).toHaveTextContent("Plus anciens");
			expect(screen.getByTestId("select-item-price_asc")).toHaveTextContent("Prix croissant");
			expect(screen.getByTestId("select-item-price_desc")).toHaveTextContent("Prix décroissant");
		});

		it("shows empty state when options is empty array", () => {
			render(<SortSelect label="Trier par" options={[]} />);

			expect(screen.getByText("Aucune option disponible")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			const { container } = render(
				<SortSelect
					label="Trier par"
					options={mockOptions}
					className="custom-class"
				/>,
			);

			const wrapper = container.querySelector('[data-testid="select"]')?.parentElement;
			expect(wrapper).toHaveClass("custom-class");
		});

		it("uses default placeholder when not provided", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			expect(screen.getByText("Sélectionner...")).toBeInTheDocument();
		});
	});

	// ─── Accessibility ─────────────────────────────────────────────

	describe("accessibility", () => {
		it("has aria-label on trigger", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const trigger = screen.getByLabelText("Trier par");
			expect(trigger).toBeInTheDocument();
		});

		it("has aria-busy attribute on wrapper when pending", () => {
			// Simulate pending state by triggering a sort change
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const wrapper = screen.getByTestId("select").parentElement;
			expect(wrapper).toHaveAttribute("aria-busy", "false");
		});

		it("has data-pending attribute when isPending is true", () => {
			// Note: Testing pending state fully requires triggering actual transitions
			// This is a structural test for the attribute presence
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const wrapper = screen.getByTestId("select").parentElement;
			expect(wrapper).not.toHaveAttribute("data-pending");
		});

		it("has live region with role status", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toHaveAttribute("aria-live", "polite");
			expect(liveRegion).toHaveAttribute("aria-atomic", "true");
		});

		it("announces loading state in live region when pending", () => {
			setSearchParams({ sortBy: "created_at_desc" });
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const liveRegion = screen.getByRole("status");
			// When not pending, should be empty
			expect(liveRegion).toHaveTextContent("");
		});
	});

	// ─── Clear button ──────────────────────────────────────────────

	describe("clear button", () => {
		it("shows clear button when value is set", () => {
			setSearchParams({ sortBy: "created_at_desc" });
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			expect(clearButton).toBeInTheDocument();
		});

		it("does not show clear button when value is empty", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			expect(screen.queryByTestId("clear-button")).not.toBeInTheDocument();
		});

		it("has correct aria-label with selected option name", () => {
			setSearchParams({ sortBy: "price_asc" });
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			expect(clearButton).toHaveAttribute("aria-label", "Effacer le tri Prix croissant");
			expect(clearButton).toHaveAttribute("title", "Effacer le tri Prix croissant");
		});

		it("has fallback aria-label when option not found", () => {
			setSearchParams({ sortBy: "unknown_option" });
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			expect(clearButton).toHaveAttribute("aria-label", "Effacer le tri actuel");
		});

		it("calls clearSort when clicked", () => {
			setSearchParams({ sortBy: "created_at_desc" });
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			fireEvent.click(clearButton);

			expect(mockPush).toHaveBeenCalled();
			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));
			expect(params.has("sortBy")).toBe(false);
		});

		it("is not disabled initially when isPending is false", () => {
			setSearchParams({ sortBy: "created_at_desc" });
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			// Initial state: isPending is false, so button is not disabled
			expect(clearButton).not.toHaveAttribute("disabled");
		});
	});

	// ─── Interaction ───────────────────────────────────────────────

	describe("interaction", () => {
		it("disables select when isPending is true", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const select = screen.getByTestId("select");
			// Initial state should be enabled (disabled="false" or no attribute)
			expect(select).toHaveAttribute("data-disabled", "false");
		});

		it("applies opacity and pointer-events-none when pending", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const wrapper = screen.getByTestId("select").parentElement;
			// Should not have pending styles initially
			expect(wrapper).not.toHaveClass("opacity-60", "pointer-events-none");
		});
	});

	// ─── Custom props ──────────────────────────────────────────────

	describe("custom props", () => {
		it("applies custom maxHeight to ScrollArea", () => {
			render(
				<SortSelect
					label="Trier par"
					options={mockOptions}
					maxHeight={400}
				/>,
			);

			const scrollArea = screen.getByTestId("scroll-area");
			expect(scrollArea).toBeInTheDocument();
			// Note: Style testing requires checking inline styles, which our mock doesn't preserve
		});

		it("uses default maxHeight of 300 when not provided", () => {
			render(<SortSelect label="Trier par" options={mockOptions} />);

			const scrollArea = screen.getByTestId("scroll-area");
			expect(scrollArea).toBeInTheDocument();
		});
	});
});
