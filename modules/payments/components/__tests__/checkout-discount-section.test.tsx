import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/discounts/actions/validate-discount-code", () => ({
	validateDiscountCode: vi.fn(),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		type?: string;
		variant?: string;
	}) => (
		<button disabled={disabled} onClick={onClick} type={type as "button" | "submit" | "reset"}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/collapsible", () => ({
	Collapsible: ({
		open,
		children,
		onOpenChange,
	}: {
		open?: boolean;
		children: React.ReactNode;
		onOpenChange?: (v: boolean) => void;
	}) => (
		<button data-testid="collapsible" data-open={open} onClick={() => onOpenChange?.(!open)}>
			{children}
		</button>
	),
	CollapsibleTrigger: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<button data-testid="collapsible-trigger" className={className}>
			{children}
		</button>
	),
	CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="collapsible-content">{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	Check: () => <svg data-testid="icon-check" />,
	ChevronRight: ({ className }: { className?: string }) => (
		<svg data-testid="icon-chevron" className={className} />
	),
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
	X: () => <svg data-testid="icon-x" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutDiscountSection } from "../checkout-discount-section";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";

// ============================================================================
// HELPERS
// ============================================================================

function createCart(overrides: Record<string, unknown> = {}): NonNullable<GetCartReturn> {
	return {
		id: "cart-1",
		items: [{ id: "item-1", priceAtAdd: 9900, quantity: 1 }],
		...overrides,
	} as unknown as NonNullable<GetCartReturn>;
}

function createMockForm(appliedDiscount: unknown = null, discountOpen = false) {
	return {
		Subscribe: ({
			selector,
			children,
		}: {
			selector: (s: unknown) => unknown;
			children: (v: unknown) => React.ReactNode;
		}) => {
			const val = selector({
				values: {
					_appliedDiscount: appliedDiscount,
					_discountOpen: discountOpen,
					discountCode: "",
				},
			});
			return children(val);
		},
		setFieldValue: vi.fn(),
		AppField: ({
			children,
		}: {
			name: string;
			validators?: unknown;
			children: (field: {
				InputField: (props: Record<string, unknown>) => React.ReactNode;
				handleBlur: () => void;
				state: { meta: { isValidating: boolean }; value: string };
			}) => React.ReactNode;
		}) =>
			children({
				InputField: (props: Record<string, unknown>) => (
					<input
						placeholder={(props.placeholder as string) || ""}
						aria-label={(props["aria-label"] as string) || "code"}
						className={(props.className as string) || ""}
					/>
				),
				handleBlur: vi.fn(),
				state: { meta: { isValidating: false }, value: "" },
			}),
	} as unknown as Parameters<typeof CheckoutDiscountSection>[0]["form"];
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CheckoutDiscountSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── No applied discount ──────────────────────────────────────────────────

	it("renders collapsible trigger 'J'ai un code promo' when no discount applied", () => {
		render(<CheckoutDiscountSection form={createMockForm(null)} />);
		expect(screen.getByText(/code promo/i)).toBeInTheDocument();
	});

	it("shows chevron icon in trigger", () => {
		render(<CheckoutDiscountSection form={createMockForm(null)} />);
		expect(screen.getByTestId("icon-chevron")).toBeInTheDocument();
	});

	// ─── Applied discount ─────────────────────────────────────────────────────

	it("shows applied discount code when discount is applied", () => {
		const discount = { code: "PROMO10", discountAmount: 990 };
		render(<CheckoutDiscountSection form={createMockForm(discount)} />);
		expect(screen.getByText("PROMO10")).toBeInTheDocument();
	});

	it("shows discount amount when applied", () => {
		const discount = { code: "PROMO10", discountAmount: 990 };
		render(<CheckoutDiscountSection form={createMockForm(discount)} />);
		expect(screen.getByText("-9.90 €")).toBeInTheDocument();
	});

	it("shows check icon when discount is applied", () => {
		const discount = { code: "PROMO10", discountAmount: 990 };
		render(<CheckoutDiscountSection form={createMockForm(discount)} />);
		expect(screen.getByTestId("icon-check")).toBeInTheDocument();
	});

	it("shows remove button (X) when discount is applied", () => {
		const discount = { code: "PROMO10", discountAmount: 990 };
		render(<CheckoutDiscountSection form={createMockForm(discount)} />);
		expect(screen.getByRole("button", { name: /Supprimer le code promo/i })).toBeInTheDocument();
	});

	it("does not show collapsible when discount is applied", () => {
		const discount = { code: "PROMO10", discountAmount: 990 };
		render(<CheckoutDiscountSection form={createMockForm(discount)} />);
		expect(screen.queryByTestId("collapsible")).not.toBeInTheDocument();
	});
});
