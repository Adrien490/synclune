import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockActiveToggle, mockToggleStatus, mockUseToggleProductTypeStatus } = vi.hoisted(() => ({
	mockActiveToggle: vi.fn(),
	mockToggleStatus: vi.fn(),
	mockUseToggleProductTypeStatus: vi.fn(),
}));

vi.mock("@/modules/product-types/hooks/use-toggle-product-type-status", () => ({
	useToggleProductTypeStatus: mockUseToggleProductTypeStatus,
}));

vi.mock("@/shared/components/active-toggle", () => ({
	ActiveToggle: (props: Record<string, unknown>) => {
		mockActiveToggle(props);
		return (
			<div
				data-testid="active-toggle"
				data-active={String(props.isActive)}
				data-disabled={String(props.disabled)}
			/>
		);
	},
}));

import { ProductTypeActiveToggle } from "../product-type-active-toggle";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ProductTypeActiveToggle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseToggleProductTypeStatus.mockReturnValue({
			toggleStatus: mockToggleStatus,
			isPending: false,
		});
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the ActiveToggle", () => {
		render(<ProductTypeActiveToggle productTypeId="pt-1" isActive={true} />);
		expect(screen.getByTestId("active-toggle")).toBeInTheDocument();
	});

	// ─── Active state ──────────────────────────────────────────────────────────

	it("passes isActive=true to ActiveToggle when active", () => {
		render(<ProductTypeActiveToggle productTypeId="pt-1" isActive={true} />);
		expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
	});

	it("passes isActive=false to ActiveToggle when inactive", () => {
		render(<ProductTypeActiveToggle productTypeId="pt-1" isActive={false} />);
		expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
	});

	// ─── isSystem prop ────────────────────────────────────────────────────────

	it("passes disabled=true to ActiveToggle when isSystem is true", () => {
		render(<ProductTypeActiveToggle productTypeId="pt-1" isActive={true} isSystem={true} />);
		expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
	});

	it("passes disabled=false to ActiveToggle when isSystem is false", () => {
		render(<ProductTypeActiveToggle productTypeId="pt-1" isActive={true} isSystem={false} />);
		expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
	});

	it("passes disabled=false by default (no isSystem prop)", () => {
		render(<ProductTypeActiveToggle productTypeId="pt-1" isActive={true} />);
		expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("passes isPending=true to ActiveToggle when hook is pending", () => {
		mockUseToggleProductTypeStatus.mockReturnValue({
			toggleStatus: mockToggleStatus,
			isPending: true,
		});
		render(<ProductTypeActiveToggle productTypeId="pt-1" isActive={false} />);
		expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ isPending: true }));
	});
});
