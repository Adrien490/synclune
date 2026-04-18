import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockOpenAlertDialog, mockDuplicate } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlertDialog: vi.fn(),
	mockDuplicate: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/modules/discounts/hooks/use-duplicate-discount", () => ({
	useDuplicateDiscount: () => ({ duplicate: mockDuplicate, isPending: false }),
}));

vi.mock("@/modules/discounts/components/admin/discount-form-dialog", () => ({
	DISCOUNT_DIALOG_ID: "discount-form",
}));
vi.mock("@/modules/discounts/components/admin/delete-discount-alert-dialog", () => ({
	DELETE_DISCOUNT_DIALOG_ID: "delete-discount",
}));
vi.mock("@/modules/discounts/components/admin/toggle-discount-status-alert-dialog", () => ({
	TOGGLE_DISCOUNT_STATUS_DIALOG_ID: "toggle-discount-status",
}));
vi.mock("@/modules/discounts/components/admin/discount-usages-dialog", () => ({
	DISCOUNT_USAGES_DIALOG_ID: "discount-usages",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} className={className} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("lucide-react", () => ({
	Copy: () => <svg data-testid="icon-copy" />,
	Eye: () => <svg data-testid="icon-eye" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	Power: () => <svg data-testid="icon-power" />,
	PowerOff: () => <svg data-testid="icon-power-off" />,
}));

import { DiscountRowActions } from "../discount-row-actions";
import type { Discount } from "@/modules/discounts/types/discount.types";

// ============================================================================
// HELPERS
// ============================================================================

function createDiscount(overrides: Record<string, unknown> = {}): Discount {
	return {
		id: "d-1",
		code: "PROMO10",
		type: "PERCENTAGE" as const,
		value: 10,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		isActive: true,
		startsAt: new Date("2026-03-01T10:00:00Z"),
		endsAt: null,
		usageCount: 0,
		createdAt: new Date("2026-03-01T10:00:00Z"),
		_count: { usages: 0 },
		...overrides,
	} as unknown as Discount;
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders trigger button with contextual aria-label including the discount code", () => {
		render(<DiscountRowActions discount={createDiscount({ code: "PROMO10" })} />);
		expect(screen.getByRole("button", { name: "Actions pour PROMO10" })).toBeInTheDocument();
	});

	it("renders trigger button with aria-label reflecting a different discount code", () => {
		render(<DiscountRowActions discount={createDiscount({ code: "CODE123" })} />);
		expect(screen.getByRole("button", { name: "Actions pour CODE123" })).toBeInTheDocument();
	});

	it("shows 'Modifier' menu item", () => {
		render(<DiscountRowActions discount={createDiscount()} />);
		expect(screen.getByText("Modifier")).toBeInTheDocument();
	});

	it("shows 'Dupliquer' menu item", () => {
		render(<DiscountRowActions discount={createDiscount()} />);
		expect(screen.getByText("Dupliquer")).toBeInTheDocument();
	});

	it("shows 'Voir les utilisations' menu item", () => {
		render(<DiscountRowActions discount={createDiscount()} />);
		expect(screen.getByText("Voir les utilisations")).toBeInTheDocument();
	});

	// ─── Toggle item ──────────────────────────────────────────────────────────

	it("shows 'Désactiver' when discount is active", () => {
		render(<DiscountRowActions discount={createDiscount({ isActive: true })} />);
		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	it("shows 'Activer' when discount is inactive", () => {
		render(<DiscountRowActions discount={createDiscount({ isActive: false })} />);
		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	// ─── Delete item ──────────────────────────────────────────────────────────

	it("renders 'Supprimer' menu item", () => {
		render(<DiscountRowActions discount={createDiscount({ usageCount: 0 })} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("disables 'Supprimer' when usageCount is greater than 0", () => {
		render(<DiscountRowActions discount={createDiscount({ usageCount: 3 })} />);
		const deleteItem = screen.getByText("Supprimer").closest("[role='menuitem']");
		expect(deleteItem).toHaveAttribute("aria-disabled", "true");
	});

	it("enables 'Supprimer' when usageCount is 0", () => {
		render(<DiscountRowActions discount={createDiscount({ usageCount: 0 })} />);
		const deleteItem = screen.getByText("Supprimer").closest("[role='menuitem']");
		expect(deleteItem).not.toHaveAttribute("aria-disabled", "true");
	});

	it("marks 'Supprimer' as destructive variant", () => {
		render(<DiscountRowActions discount={createDiscount()} />);
		const deleteItem = screen.getByRole("menuitem", { name: "Supprimer" });
		expect(deleteItem).toHaveAttribute("data-variant", "destructive");
	});
});
