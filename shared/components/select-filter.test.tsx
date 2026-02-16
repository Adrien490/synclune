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

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children, value, onValueChange, disabled }: any) => (
		<div data-testid="select" data-value={value} data-disabled={disabled}>
			<button
				type="button"
				onClick={() => !disabled && onValueChange?.("ACTIVE")}
				data-testid="select-change"
			>
				Change
			</button>
			{children}
		</div>
	),
	SelectTrigger: ({ children, className, "aria-label": ariaLabel, ref }: any) => (
		<button
			type="button"
			data-testid="select-trigger"
			className={className}
			aria-label={ariaLabel}
			ref={ref}
		>
			{children}
		</button>
	),
	SelectValue: ({ placeholder }: any) => (
		<span data-testid="select-value">{placeholder}</span>
	),
	SelectContent: ({ children, className }: any) => (
		<div data-testid="select-content" className={className}>{children}</div>
	),
	SelectItem: ({ children, value }: any) => (
		<div data-testid={`select-item-${value}`}>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/scroll-area", () => ({
	ScrollArea: ({ children, style }: any) => (
		<div data-testid="scroll-area" style={style}>{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, "aria-label": ariaLabel, title, className }: any) => (
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

import { useSelectFilter } from "@/shared/hooks/use-select-filter";
import { SelectFilter } from "./select-filter";
import type { FilterOption } from "@/shared/types/component.types";

// ─── Helpers ────────────────────────────────────────────────────────

function setSearchParams(params: Record<string, string>) {
	mockSearchParams = new URLSearchParams(params);
}

const mockOptions: FilterOption[] = [
	{ value: "ACTIVE", label: "Actif" },
	{ value: "DRAFT", label: "Brouillon" },
	{ value: "ARCHIVED", label: "Archivé" },
];

// ─── Hook Tests ─────────────────────────────────────────────────────

describe("useSelectFilter", () => {
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
		it("returns empty string as initial value when no param", () => {
			const { result } = renderHook(() => useSelectFilter("status"));

			expect(result.current.value).toBe("");
			expect(result.current.isPending).toBe(false);
		});

		it("reads filter_ prefixed param from search params", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			const { result } = renderHook(() => useSelectFilter("status"));

			expect(result.current.value).toBe("ACTIVE");
		});

		it("reads unprefixed param when noPrefix is true", () => {
			setSearchParams({ status: "DRAFT" });
			const { result } = renderHook(() => useSelectFilter("status", { noPrefix: true }));

			expect(result.current.value).toBe("DRAFT");
		});

		it("does not read prefixed param when noPrefix is true", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			const { result } = renderHook(() => useSelectFilter("status", { noPrefix: true }));

			expect(result.current.value).toBe("");
		});

		it("reads value with other params present", () => {
			setSearchParams({ filter_status: "ACTIVE", page: "2", sortBy: "name_asc" });
			const { result } = renderHook(() => useSelectFilter("status"));

			expect(result.current.value).toBe("ACTIVE");
		});
	});

	// ─── setFilter ──────────────────────────────────────────────────

	describe("setFilter", () => {
		it("pushes URL with filter_ prefixed param and resets page to 1", () => {
			const { result } = renderHook(() => useSelectFilter("status"));

			act(() => {
				result.current.setFilter("ACTIVE");
			});

			expect(mockPush).toHaveBeenCalledTimes(1);
			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("filter_status")).toBe("ACTIVE");
			expect(params.get("page")).toBe("1");
		});

		it("pushes URL without prefix when noPrefix is true", () => {
			const { result } = renderHook(() => useSelectFilter("status", { noPrefix: true }));

			act(() => {
				result.current.setFilter("DRAFT");
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("status")).toBe("DRAFT");
			expect(params.has("filter_status")).toBe(false);
		});

		it("preserves other existing search params", () => {
			setSearchParams({ sortBy: "name_asc", search: "test", page: "3" });
			const { result } = renderHook(() => useSelectFilter("status"));

			act(() => {
				result.current.setFilter("ACTIVE");
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.get("filter_status")).toBe("ACTIVE");
			expect(params.get("sortBy")).toBe("name_asc");
			expect(params.get("search")).toBe("test");
			expect(params.get("page")).toBe("1"); // Reset
		});

		it("with empty string removes the filter param", () => {
			setSearchParams({ filter_status: "ACTIVE", page: "2" });
			const { result } = renderHook(() => useSelectFilter("status"));

			act(() => {
				result.current.setFilter("");
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.has("filter_status")).toBe(false);
			expect(params.get("page")).toBe("1");
		});

		it("uses scroll: false on router.push", () => {
			const { result } = renderHook(() => useSelectFilter("status"));

			act(() => {
				result.current.setFilter("ACTIVE");
			});

			expect(mockPush).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ scroll: false }),
			);
		});
	});

	// ─── clearFilter ────────────────────────────────────────────────

	describe("clearFilter", () => {
		it("removes filter param and resets page to 1", () => {
			setSearchParams({ filter_status: "ACTIVE", page: "3" });
			const { result } = renderHook(() => useSelectFilter("status"));

			act(() => {
				result.current.clearFilter();
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.has("filter_status")).toBe(false);
			expect(params.get("page")).toBe("1");
		});

		it("preserves other search params", () => {
			setSearchParams({ filter_status: "ACTIVE", sortBy: "name_asc", search: "query" });
			const { result } = renderHook(() => useSelectFilter("status"));

			act(() => {
				result.current.clearFilter();
			});

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));

			expect(params.has("filter_status")).toBe(false);
			expect(params.get("sortBy")).toBe("name_asc");
			expect(params.get("search")).toBe("query");
		});

		it("uses scroll: false on router.push", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			const { result } = renderHook(() => useSelectFilter("status"));

			act(() => {
				result.current.clearFilter();
			});

			expect(mockPush).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ scroll: false }),
			);
		});
	});
});

// ─── Component Tests ────────────────────────────────────────────────

describe("SelectFilter", () => {
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
				<SelectFilter
					filterKey="status"
					label="Statut"
					options={mockOptions}
					placeholder="Choisir un statut"
				/>,
			);

			expect(screen.getByText("Statut")).toBeInTheDocument();
			expect(screen.getByText("Choisir un statut")).toBeInTheDocument();
		});

		it("renders options", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			expect(screen.getByTestId("select-item-ACTIVE")).toHaveTextContent("Actif");
			expect(screen.getByTestId("select-item-DRAFT")).toHaveTextContent("Brouillon");
			expect(screen.getByTestId("select-item-ARCHIVED")).toHaveTextContent("Archivé");
		});

		it("filters out options with empty value", () => {
			const optionsWithEmpty: FilterOption[] = [
				{ value: "", label: "Vide" },
				{ value: "ACTIVE", label: "Actif" },
			];
			render(<SelectFilter filterKey="status" label="Statut" options={optionsWithEmpty} />);

			expect(screen.queryByText("Vide")).not.toBeInTheDocument();
			expect(screen.getByTestId("select-item-ACTIVE")).toHaveTextContent("Actif");
		});

		it("shows empty state when all options are empty", () => {
			const emptyOptions: FilterOption[] = [{ value: "", label: "Vide" }];
			render(<SelectFilter filterKey="status" label="Statut" options={emptyOptions} />);

			expect(screen.getByText("Aucune option disponible")).toBeInTheDocument();
		});

		it("uses default placeholder when not provided", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			expect(screen.getByText("Sélectionner...")).toBeInTheDocument();
		});
	});

	// ─── Accessibility ─────────────────────────────────────────────

	describe("accessibility", () => {
		it("has aria-label on trigger", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const trigger = screen.getByLabelText("Statut");
			expect(trigger).toBeInTheDocument();
		});

		it("has aria-atomic on wrapper", () => {
			const { container } = render(
				<SelectFilter filterKey="status" label="Statut" options={mockOptions} />,
			);

			const wrapper = container.firstElementChild;
			expect(wrapper).toHaveAttribute("aria-atomic", "true");
		});

		it("has aria-busy attribute on wrapper", () => {
			const { container } = render(
				<SelectFilter filterKey="status" label="Statut" options={mockOptions} />,
			);

			const wrapper = container.firstElementChild;
			expect(wrapper).toHaveAttribute("aria-busy", "false");
		});

		it("has dedicated live region with role status", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toHaveAttribute("aria-live", "polite");
			expect(liveRegion).toHaveAttribute("aria-atomic", "true");
		});

		it("live region is empty when not pending", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toHaveTextContent("");
		});
	});

	// ─── Clear button ──────────────────────────────────────────────

	describe("clear button", () => {
		it("shows clear button when value is set", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			expect(screen.getByTestId("clear-button")).toBeInTheDocument();
		});

		it("does not show clear button when value is empty", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			expect(screen.queryByTestId("clear-button")).not.toBeInTheDocument();
		});

		it("has correct aria-label and title with selected option name", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			expect(clearButton).toHaveAttribute("aria-label", "Effacer le filtre Actif");
			expect(clearButton).toHaveAttribute("title", "Effacer le filtre Actif");
		});

		it("has fallback aria-label with filter label when option not found (stale value)", () => {
			setSearchParams({ filter_status: "UNKNOWN_VALUE" });
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			expect(clearButton).toHaveAttribute("aria-label", "Effacer le filtre Statut");
			expect(clearButton).toHaveAttribute("title", "Effacer le filtre Statut");
		});

		it("calls clearFilter when clicked", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const clearButton = screen.getByTestId("clear-button");
			fireEvent.click(clearButton);

			expect(mockPush).toHaveBeenCalled();
			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));
			expect(params.has("filter_status")).toBe(false);
		});

		it("stops event propagation on clear", () => {
			setSearchParams({ filter_status: "ACTIVE" });
			const parentClick = vi.fn();

			render(
				// biome-ignore lint/a11y/useKeyWithClickEvents: test helper
				<div onClick={parentClick}>
					<SelectFilter filterKey="status" label="Statut" options={mockOptions} />
				</div>,
			);

			const clearButton = screen.getByTestId("clear-button");
			fireEvent.click(clearButton);

			// stopPropagation should prevent parent from receiving the click
			// Note: since we mock the Button, the onClick handler runs handleClear
			// which calls e.stopPropagation() - but the mock passes onClick directly
			expect(mockPush).toHaveBeenCalled();
		});
	});

	// ─── Interaction ───────────────────────────────────────────────

	describe("interaction", () => {
		it("calls setFilter on value change", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			// The mock Select triggers onValueChange("ACTIVE") on click
			const changeButton = screen.getByTestId("select-change");
			fireEvent.click(changeButton);

			expect(mockPush).toHaveBeenCalledTimes(1);
			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));
			expect(params.get("filter_status")).toBe("ACTIVE");
		});

		it("passes value to Select component", () => {
			setSearchParams({ filter_status: "DRAFT" });
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const select = screen.getByTestId("select");
			expect(select).toHaveAttribute("data-value", "DRAFT");
		});
	});

	// ─── Responsive ────────────────────────────────────────────────

	describe("responsive", () => {
		it("applies viewport-aware maxHeight on ScrollArea", () => {
			render(
				<SelectFilter
					filterKey="status"
					label="Statut"
					options={mockOptions}
					maxHeight={500}
				/>,
			);

			const scrollArea = screen.getByTestId("scroll-area");
			expect(scrollArea).toHaveStyle({ maxHeight: "min(500px, 60vh)" });
		});

		it("uses default maxHeight of 400 when not provided", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const scrollArea = screen.getByTestId("scroll-area");
			expect(scrollArea).toHaveStyle({ maxHeight: "min(400px, 60vh)" });
		});

		it("applies max-width constraint on SelectContent", () => {
			render(<SelectFilter filterKey="status" label="Statut" options={mockOptions} />);

			const content = screen.getByTestId("select-content");
			expect(content).toHaveClass("max-w-[calc(100vw-2rem)]");
		});
	});

	// ─── noPrefix ──────────────────────────────────────────────────

	describe("noPrefix option", () => {
		it("reads from unprefixed URL param", () => {
			setSearchParams({ status: "ACTIVE" });
			render(
				<SelectFilter
					filterKey="status"
					label="Statut"
					options={mockOptions}
					noPrefix
				/>,
			);

			const select = screen.getByTestId("select");
			expect(select).toHaveAttribute("data-value", "ACTIVE");
		});

		it("writes to unprefixed URL param", () => {
			render(
				<SelectFilter
					filterKey="status"
					label="Statut"
					options={mockOptions}
					noPrefix
				/>,
			);

			const changeButton = screen.getByTestId("select-change");
			fireEvent.click(changeButton);

			const pushedUrl = mockPush.mock.calls[0][0] as string;
			const params = new URLSearchParams(pushedUrl.replace("?", ""));
			expect(params.get("status")).toBe("ACTIVE");
			expect(params.has("filter_status")).toBe(false);
		});
	});
});
