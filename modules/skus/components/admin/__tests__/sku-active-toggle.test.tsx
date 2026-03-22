import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockActiveToggle, mockToggleStatus, mockUseUpdateProductSkuStatus, mockRouterRefresh } =
	vi.hoisted(() => ({
		mockActiveToggle: vi.fn(),
		mockToggleStatus: vi.fn(),
		mockUseUpdateProductSkuStatus: vi.fn(),
		mockRouterRefresh: vi.fn(),
	}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRouterRefresh }),
}));

vi.mock("@/modules/skus/hooks/use-update-sku-status", () => ({
	useUpdateProductSkuStatus: mockUseUpdateProductSkuStatus,
}));

vi.mock("@/shared/components/active-toggle", () => ({
	ActiveToggle: (props: Record<string, unknown>) => {
		mockActiveToggle(props);
		return <div data-testid="active-toggle" />;
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { ProductSkuActiveToggle } from "../sku-active-toggle";

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	mockUseUpdateProductSkuStatus.mockReturnValue({
		isPending: false,
		toggleStatus: mockToggleStatus,
		state: undefined,
	});
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("ProductSkuActiveToggle", () => {
	it("renders the ActiveToggle", () => {
		render(<ProductSkuActiveToggle skuId="sku-1" isActive={true} isDefault={false} />);

		expect(screen.getByTestId("active-toggle")).toBeInTheDocument();
	});

	describe("default and active SKU", () => {
		it("is disabled when isDefault and isActive are both true", () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={true} isDefault={true} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
		});

		it('shows activeLabel containing "principale" when isDefault and isActive', () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={true} isDefault={true} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(
				expect.objectContaining({
					activeLabel: expect.stringContaining("principale"),
				}),
			);
		});

		it("passes isActive=true to ActiveToggle", () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={true} isDefault={true} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
		});
	});

	describe("non-default active SKU", () => {
		it("is not disabled when isDefault=false and isActive=true", () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={true} isDefault={false} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
		});

		it('shows activeLabel "Désactiver la variante" when non-default', () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={true} isDefault={false} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(
				expect.objectContaining({ activeLabel: "Désactiver la variante" }),
			);
		});
	});

	describe("non-default inactive SKU", () => {
		it("passes isActive=false to ActiveToggle", () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={false} isDefault={false} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
		});

		it('shows inactiveLabel "Activer la variante"', () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={false} isDefault={false} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(
				expect.objectContaining({ inactiveLabel: "Activer la variante" }),
			);
		});

		it("is not disabled when inactive and non-default", () => {
			render(<ProductSkuActiveToggle skuId="sku-1" isActive={false} isDefault={false} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ disabled: false }));
		});
	});

	describe("pending state", () => {
		it("passes isPending=true from hook to ActiveToggle", () => {
			mockUseUpdateProductSkuStatus.mockReturnValue({
				isPending: true,
				toggleStatus: mockToggleStatus,
				state: undefined,
			});

			render(<ProductSkuActiveToggle skuId="sku-1" isActive={false} isDefault={false} />);

			expect(mockActiveToggle).toHaveBeenCalledWith(expect.objectContaining({ isPending: true }));
		});
	});
});
