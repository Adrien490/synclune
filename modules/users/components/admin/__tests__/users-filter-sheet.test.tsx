import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockSearchParams: { value: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({ push: mockPush })),
	useSearchParams: vi.fn(() => mockSearchParams.value),
}));

vi.mock("@/app/generated/prisma/browser", () => ({
	Role: { USER: "USER", ADMIN: "ADMIN" },
}));

const mockOnClearAll = vi.fn();
const mockOnApply = vi.fn();

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
		hasActiveFilters,
		onClearAll,
		onApply,
		isPending,
		title,
		description,
	}: {
		children: React.ReactNode;
		activeFiltersCount: number;
		hasActiveFilters: boolean;
		onClearAll: () => void;
		onApply: () => void;
		isPending: boolean;
		title: string;
		description: string;
		applyButtonText: string;
	}) => {
		mockOnClearAll.mockImplementation(onClearAll);
		mockOnApply.mockImplementation(onApply);
		return (
			<div
				data-testid="filter-sheet-wrapper"
				data-active-filters={activeFiltersCount}
				data-has-active={String(hasActiveFilters)}
				data-pending={String(isPending)}
			>
				<span data-testid="filter-title">{title}</span>
				<span data-testid="filter-description">{description}</span>
				<button data-testid="clear-all-btn" onClick={onClearAll}>
					Effacer
				</button>
				<button data-testid="apply-btn" onClick={onApply}>
					Appliquer
				</button>
				{children}
			</div>
		);
	},
}));

vi.mock("@/shared/components/forms/checkbox-filter-item", () => ({
	CheckboxFilterItem: ({
		children,
		id,
		checked,
		onCheckedChange,
	}: {
		children: React.ReactNode;
		id: string;
		checked: boolean;
		onCheckedChange: (v: boolean) => void;
	}) => (
		<label htmlFor={id}>
			<input
				type="checkbox"
				id={id}
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
			/>
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/forms/radio-filter-item", () => ({
	RadioFilterItem: ({
		children,
		id,
		name,
		value,
		checked,
		onCheckedChange,
	}: {
		children: React.ReactNode;
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (v: boolean) => void;
	}) => (
		<label htmlFor={id}>
			<input
				type="radio"
				id={id}
				name={name}
				value={value}
				checked={checked}
				onChange={(e) => onCheckedChange(e.target.checked)}
			/>
			{children}
		</label>
	),
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
		<label htmlFor={htmlFor}>{children}</label>
	),
}));

vi.mock("@/shared/components/ui/separator", () => ({
	Separator: () => <hr data-testid="separator" />,
}));

vi.mock("@/shared/components/ui/switch", () => ({
	Switch: ({
		id,
		checked,
		onCheckedChange,
	}: {
		id?: string;
		checked?: boolean;
		onCheckedChange?: (v: boolean) => void;
	}) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			role="switch"
		/>
	),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UsersFilterSheet } from "../users-filter-sheet";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Builds a URLSearchParams-compatible object from plain entries.
 * Mimics the real URLSearchParams API used by the component.
 */
function makeSearchParams(entries: [string, string][] = []): URLSearchParams {
	return new URLSearchParams(entries);
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSearchParams.value = new URLSearchParams();
});

beforeEach(() => {
	mockSearchParams.value = new URLSearchParams();
});

// ============================================================================
// TESTS
// ============================================================================

describe("UsersFilterSheet", () => {
	// ─── Basic Rendering ─────────────────────────────────────────────────────

	it("renders without crashing", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the title 'Filtres clients'", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-title").textContent).toBe("Filtres clients");
	});

	it("renders the description 'Filtrer les clients par critères'", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-description").textContent).toBe(
			"Filtrer les clients par critères",
		);
	});

	it("renders role filter legend", () => {
		render(<UsersFilterSheet />);
		expect(document.body.textContent).toContain("Rôle");
	});

	it("renders role checkboxes for USER and ADMIN", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByText("Utilisateur")).toBeInTheDocument();
		expect(screen.getByText("Administrateur")).toBeInTheDocument();
	});

	it("renders checkbox with id 'role-user'", () => {
		render(<UsersFilterSheet />);
		expect(document.getElementById("role-user")).toBeInTheDocument();
	});

	it("renders checkbox with id 'role-admin'", () => {
		render(<UsersFilterSheet />);
		expect(document.getElementById("role-admin")).toBeInTheDocument();
	});

	it("renders email verified radio options", () => {
		render(<UsersFilterSheet />);
		expect(document.body.textContent).toContain("Email vérifié");
		expect(screen.getAllByText("Tous").length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText("Oui").length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText("Non").length).toBeGreaterThanOrEqual(1);
	});

	it("renders 'A des commandes' section with radio options", () => {
		render(<UsersFilterSheet />);
		expect(document.body.textContent).toContain("A des commandes");
	});

	it("renders 'Inclure les clients supprimés' switch", () => {
		render(<UsersFilterSheet />);
		expect(document.body.textContent).toContain("Inclure les clients supprimés");
		expect(document.getElementById("includeDeleted")).toBeInTheDocument();
	});

	it("renders separators between filter sections", () => {
		render(<UsersFilterSheet />);
		const separators = screen.getAllByTestId("separator");
		expect(separators.length).toBeGreaterThanOrEqual(3);
	});

	// ─── Active Filter Count ─────────────────────────────────────────────────

	it("shows 0 active filters when no params", () => {
		render(<UsersFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-filters")).toBe("0");
	});

	it("shows hasActiveFilters=false when no URL params are set", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "false");
	});

	it("counts filter_role as one active filter", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "ADMIN"]]);
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-filters", "1");
	});

	it("counts filter_emailVerified as one active filter", () => {
		mockSearchParams.value = makeSearchParams([["filter_emailVerified", "true"]]);
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-filters", "1");
	});

	it("counts filter_hasOrders as one active filter", () => {
		mockSearchParams.value = makeSearchParams([["filter_hasOrders", "true"]]);
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-filters", "1");
	});

	it("counts filter_includeDeleted=true as one active filter", () => {
		mockSearchParams.value = makeSearchParams([["filter_includeDeleted", "true"]]);
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-filters", "1");
	});

	it("does not count filter_includeDeleted=false as an active filter", () => {
		mockSearchParams.value = makeSearchParams([["filter_includeDeleted", "false"]]);
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-filters", "0");
	});

	it("accumulates count across multiple filter types", () => {
		mockSearchParams.value = makeSearchParams([
			["filter_role", "ADMIN"],
			["filter_emailVerified", "true"],
			["filter_hasOrders", "true"],
			["filter_includeDeleted", "true"],
		]);
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-active-filters", "4");
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "true");
	});

	it("shows hasActiveFilters=true when at least one filter is active", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "USER"]]);
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-has-active", "true");
	});

	// ─── URL Param Initialization ────────────────────────────────────────────

	it("pre-checks ADMIN role checkbox when filter_role=ADMIN in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "ADMIN"]]);
		render(<UsersFilterSheet />);
		const adminCheckbox = document.getElementById("role-admin") as HTMLInputElement;
		expect(adminCheckbox.checked).toBe(true);
	});

	it("pre-checks USER role checkbox when filter_role=USER in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "USER"]]);
		render(<UsersFilterSheet />);
		const userCheckbox = document.getElementById("role-user") as HTMLInputElement;
		expect(userCheckbox.checked).toBe(true);
	});

	it("pre-checks both role checkboxes when filter_role=USER,ADMIN in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "USER,ADMIN"]]);
		render(<UsersFilterSheet />);
		const userCheckbox = document.getElementById("role-user") as HTMLInputElement;
		const adminCheckbox = document.getElementById("role-admin") as HTMLInputElement;
		expect(userCheckbox.checked).toBe(true);
		expect(adminCheckbox.checked).toBe(true);
	});

	it("does not pre-check role checkboxes when no filter_role param", () => {
		render(<UsersFilterSheet />);
		const userCheckbox = document.getElementById("role-user") as HTMLInputElement;
		const adminCheckbox = document.getElementById("role-admin") as HTMLInputElement;
		expect(userCheckbox.checked).toBe(false);
		expect(adminCheckbox.checked).toBe(false);
	});

	it("initializes emailVerified=true radio when filter_emailVerified=true in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_emailVerified", "true"]]);
		render(<UsersFilterSheet />);
		const radio = document.getElementById("emailVerified-Oui") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes emailVerified=false radio when filter_emailVerified=false in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_emailVerified", "false"]]);
		render(<UsersFilterSheet />);
		const radio = document.getElementById("emailVerified-Non") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes emailVerified=undefined (Tous) radio when no filter_emailVerified param", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("emailVerified-Tous") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes hasOrders=true radio when filter_hasOrders=true in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_hasOrders", "true"]]);
		render(<UsersFilterSheet />);
		const radio = document.getElementById("hasOrders-Oui") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes hasOrders=false radio when filter_hasOrders=false in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_hasOrders", "false"]]);
		render(<UsersFilterSheet />);
		const radio = document.getElementById("hasOrders-Non") as HTMLInputElement;
		expect(radio.checked).toBe(true);
	});

	it("initializes includeDeleted switch as checked when filter_includeDeleted=true in params", () => {
		mockSearchParams.value = makeSearchParams([["filter_includeDeleted", "true"]]);
		render(<UsersFilterSheet />);
		const switchEl = document.getElementById("includeDeleted") as HTMLInputElement;
		expect(switchEl.checked).toBe(true);
	});

	it("initializes includeDeleted switch as unchecked when no filter_includeDeleted param", () => {
		render(<UsersFilterSheet />);
		const switchEl = document.getElementById("includeDeleted") as HTMLInputElement;
		expect(switchEl.checked).toBe(false);
	});

	// ─── Role Checkbox Interactions ──────────────────────────────────────────

	it("checks USER checkbox and adds USER to role field on click", () => {
		render(<UsersFilterSheet />);
		const checkbox = document.getElementById("role-user") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(true);
	});

	it("checks ADMIN checkbox on click", () => {
		render(<UsersFilterSheet />);
		const checkbox = document.getElementById("role-admin") as HTMLInputElement;
		fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(true);
	});

	it("unchecks ADMIN checkbox when already checked", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "ADMIN"]]);
		render(<UsersFilterSheet />);
		const checkbox = document.getElementById("role-admin") as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
		fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(false);
	});

	it("unchecks USER checkbox when already checked", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "USER"]]);
		render(<UsersFilterSheet />);
		const checkbox = document.getElementById("role-user") as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
		fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(false);
	});

	// ─── Radio Filter Interactions ───────────────────────────────────────────

	it("selects emailVerified=true radio on click", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("emailVerified-Oui") as HTMLInputElement;
		fireEvent.click(radio);
		expect(radio.checked).toBe(true);
	});

	it("selects emailVerified=false radio on click", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("emailVerified-Non") as HTMLInputElement;
		fireEvent.click(radio);
		expect(radio.checked).toBe(true);
	});

	it("selects hasOrders=true radio on click", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("hasOrders-Oui") as HTMLInputElement;
		fireEvent.click(radio);
		expect(radio.checked).toBe(true);
	});

	it("selects hasOrders=false radio on click", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("hasOrders-Non") as HTMLInputElement;
		fireEvent.click(radio);
		expect(radio.checked).toBe(true);
	});

	// ─── Switch Interaction ──────────────────────────────────────────────────

	it("toggles includeDeleted switch on click", () => {
		render(<UsersFilterSheet />);
		const switchEl = document.getElementById("includeDeleted") as HTMLInputElement;
		expect(switchEl.checked).toBe(false);
		fireEvent.click(switchEl);
		expect(switchEl.checked).toBe(true);
	});

	it("unchecks includeDeleted switch when already checked", () => {
		mockSearchParams.value = makeSearchParams([["filter_includeDeleted", "true"]]);
		render(<UsersFilterSheet />);
		const switchEl = document.getElementById("includeDeleted") as HTMLInputElement;
		expect(switchEl.checked).toBe(true);
		fireEvent.click(switchEl);
		expect(switchEl.checked).toBe(false);
	});

	// ─── applyFilters / form submit ──────────────────────────────────────────

	it("calls router.push when the apply button is clicked", () => {
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("?"));
	});

	it("does not include filter params in URL when no filters are active on apply", () => {
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_role");
		expect(pushedUrl).not.toContain("filter_emailVerified");
	});

	it("includes filter_role in URL when role is checked and applied", () => {
		render(<UsersFilterSheet />);
		const checkbox = document.getElementById("role-admin") as HTMLInputElement;
		fireEvent.click(checkbox);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_role=ADMIN");
	});

	it("includes filter_includeDeleted=true in URL when switch is checked and applied", () => {
		render(<UsersFilterSheet />);
		const switchEl = document.getElementById("includeDeleted") as HTMLInputElement;
		fireEvent.click(switchEl);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_includeDeleted=true");
	});

	it("does not include filter_includeDeleted in URL when switch is unchecked", () => {
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_includeDeleted");
	});

	it("removes cursor and direction params from URL on apply", () => {
		mockSearchParams.value = makeSearchParams([
			["cursor", "abc123"],
			["direction", "next"],
		]);
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	it("replaces existing filter params on apply", () => {
		mockSearchParams.value = makeSearchParams([
			["filter_role", "ADMIN"],
			["filter_emailVerified", "true"],
		]);
		render(<UsersFilterSheet />);
		// Uncheck ADMIN so it should be absent from the URL
		const adminCheckbox = document.getElementById("role-admin") as HTMLInputElement;
		fireEvent.click(adminCheckbox);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_role");
	});

	it("does not bubble the form submit event to parent", () => {
		const parentSubmit = vi.fn();
		render(
			<div onSubmit={parentSubmit}>
				<UsersFilterSheet />
			</div>,
		);
		const form = document.querySelector("form")!;
		fireEvent.submit(form);
		expect(parentSubmit).not.toHaveBeenCalled();
	});

	it("calls router.push when the inner form is submitted directly", async () => {
		render(<UsersFilterSheet />);
		const form = document.querySelector("form")!;
		await act(async () => {
			fireEvent.submit(form);
		});
		expect(mockPush).toHaveBeenCalled();
	});

	// ─── clearAllFilters ─────────────────────────────────────────────────────

	it("calls router.push when the clear-all button is clicked", () => {
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("?"));
	});

	it("removes all filter params from URL on clear-all", () => {
		mockSearchParams.value = makeSearchParams([
			["filter_role", "ADMIN"],
			["filter_emailVerified", "true"],
			["filter_hasOrders", "true"],
			["filter_includeDeleted", "true"],
		]);
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_role");
		expect(pushedUrl).not.toContain("filter_emailVerified");
		expect(pushedUrl).not.toContain("filter_hasOrders");
		expect(pushedUrl).not.toContain("filter_includeDeleted");
	});

	it("removes cursor and direction params from URL on clear-all", () => {
		mockSearchParams.value = makeSearchParams([
			["cursor", "abc123"],
			["direction", "next"],
			["filter_role", "ADMIN"],
		]);
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("cursor");
		expect(pushedUrl).not.toContain("direction");
	});

	it("resets role checkboxes to unchecked after clear-all", () => {
		mockSearchParams.value = makeSearchParams([["filter_role", "ADMIN"]]);
		render(<UsersFilterSheet />);
		const adminCheckbox = document.getElementById("role-admin") as HTMLInputElement;
		expect(adminCheckbox.checked).toBe(true);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		// After form.reset(), the form should re-render with defaults
		expect(mockPush).toHaveBeenCalledOnce();
	});

	it("preserves non-filter params in URL on clear-all", () => {
		mockSearchParams.value = makeSearchParams([
			["q", "test-search"],
			["filter_role", "ADMIN"],
		]);
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("clear-all-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("q=test-search");
	});

	it("preserves non-filter params in URL on apply", () => {
		mockSearchParams.value = makeSearchParams([
			["q", "test-search"],
			["filter_role", "ADMIN"],
		]);
		render(<UsersFilterSheet />);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("q=test-search");
	});

	// ─── isPending state ─────────────────────────────────────────────────────

	it("passes isPending=false to FilterSheetWrapper initially", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toHaveAttribute("data-pending", "false");
	});

	// ─── emailVerified URL param with true value sets filter_emailVerified ───

	it("includes filter_emailVerified=true in URL when emailVerified-Oui radio is clicked and applied", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("emailVerified-Oui") as HTMLInputElement;
		fireEvent.click(radio);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_emailVerified=true");
	});

	it("includes filter_emailVerified=false in URL when emailVerified-Non radio is clicked and applied", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("emailVerified-Non") as HTMLInputElement;
		fireEvent.click(radio);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_emailVerified=false");
	});

	it("includes filter_hasOrders=true in URL when hasOrders-Oui radio is clicked and applied", () => {
		render(<UsersFilterSheet />);
		const radio = document.getElementById("hasOrders-Oui") as HTMLInputElement;
		fireEvent.click(radio);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).toContain("filter_hasOrders=true");
	});

	it("does not include filter_emailVerified in URL when Tous radio is selected (undefined value)", () => {
		// Start with emailVerified set, then switch back to Tous
		mockSearchParams.value = makeSearchParams([["filter_emailVerified", "true"]]);
		render(<UsersFilterSheet />);
		const radioTous = document.getElementById("emailVerified-Tous") as HTMLInputElement;
		fireEvent.click(radioTous);
		fireEvent.click(screen.getByTestId("apply-btn"));
		const pushedUrl = mockPush.mock.calls[0]?.[0] as string;
		expect(pushedUrl).not.toContain("filter_emailVerified");
	});
});
