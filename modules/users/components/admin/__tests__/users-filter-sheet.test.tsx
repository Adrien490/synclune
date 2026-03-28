import { cleanup, render, screen } from "@testing-library/react";
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

vi.mock("@/shared/components/filter-sheet-wrapper", () => ({
	FilterSheetWrapper: ({
		children,
		activeFiltersCount,
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
		showCancelButton: boolean;
	}) => (
		<div data-testid="filter-sheet-wrapper" data-active-filters={activeFiltersCount}>
			<span data-testid="filter-title">{title}</span>
			<span data-testid="filter-description">{description}</span>
			{children}
		</div>
	),
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
		<label>
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
		checked,
	}: {
		children: React.ReactNode;
		id: string;
		name: string;
		value: string;
		checked: boolean;
		onCheckedChange: (v: boolean) => void;
	}) => (
		<label>
			<input type="radio" id={id} name={name} readOnly checked={checked} />
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
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSearchParams.value = new URLSearchParams();
});

beforeEach(() => {
	mockSearchParams.value = new URLSearchParams();
});

describe("UsersFilterSheet", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the filter sheet wrapper", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-sheet-wrapper")).toBeInTheDocument();
	});

	it("renders the title 'Filtres clients'", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByTestId("filter-title").textContent).toBe("Filtres clients");
	});

	it("renders role filter checkboxes", () => {
		render(<UsersFilterSheet />);
		expect(screen.getByText("Utilisateur")).toBeInTheDocument();
		expect(screen.getByText("Administrateur")).toBeInTheDocument();
	});

	it("renders email verified radio options", () => {
		render(<UsersFilterSheet />);
		const allLabels = document.body.textContent ?? "";
		expect(allLabels).toContain("Email vérifié");
	});

	it("renders marketing opt-in section", () => {
		render(<UsersFilterSheet />);
		expect(document.body.textContent).toContain("Marketing opt-in");
	});

	it("renders 'A des commandes' section", () => {
		render(<UsersFilterSheet />);
		expect(document.body.textContent).toContain("A des commandes");
	});

	it("renders 'Inclure les clients supprimés' switch", () => {
		render(<UsersFilterSheet />);
		expect(document.body.textContent).toContain("Inclure les clients supprimés");
	});

	it("renders separators between filter sections", () => {
		render(<UsersFilterSheet />);
		const separators = screen.getAllByTestId("separator");
		expect(separators.length).toBeGreaterThanOrEqual(4);
	});

	// ─── Active filter count ──────────────────────────────────────────────────

	it("shows 0 active filters when no params", () => {
		render(<UsersFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-filters")).toBe("0");
	});

	it("counts active filters from search params", () => {
		mockSearchParams.value = new URLSearchParams("filter_role=ADMIN&filter_emailVerified=true");
		render(<UsersFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-filters")).toBe("2");
	});

	it("counts includeDeleted as active filter when set to true", () => {
		mockSearchParams.value = new URLSearchParams("filter_includeDeleted=true");
		render(<UsersFilterSheet />);
		const wrapper = screen.getByTestId("filter-sheet-wrapper");
		expect(wrapper.getAttribute("data-active-filters")).toBe("1");
	});

	// ─── Initial values from search params ───────────────────────────────────

	it("pre-checks ADMIN role checkbox when filter_role=ADMIN in params", () => {
		mockSearchParams.value = new URLSearchParams("filter_role=ADMIN");
		render(<UsersFilterSheet />);
		const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
		// Find the ADMIN checkbox (role-admin)
		const adminCheckbox = document.getElementById("role-admin") as HTMLInputElement;
		expect(adminCheckbox?.checked).toBe(true);
	});
});
