import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/modules/orders/services/shipping.service", () => ({
	calculateShipping: vi.fn().mockReturnValue(490),
	getShippingInfo: vi.fn().mockReturnValue(null),
}));

vi.mock("@/modules/payments/hooks/use-checkout-form", () => ({
	useCheckoutForm: vi.fn(),
}));

vi.mock("@/modules/payments/components/checkout-summary", () => ({
	CheckoutSummary: () => <div data-testid="checkout-summary" />,
}));

vi.mock("@/modules/payments/components/payment-step", () => ({
	PaymentStep: ({ orderNumber }: { orderNumber: string | null }) => (
		<div data-testid="payment-step" data-order-number={orderNumber ?? ""} />
	),
}));

vi.mock("@/modules/payments/components/address-selector", () => ({
	AddressSelector: () => <div data-testid="address-selector" />,
}));

vi.mock("@/modules/discounts/actions/validate-discount-code", () => ({
	validateDiscountCode: vi.fn(),
}));

vi.mock("@/shared/components/error-boundary", () => ({
	ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { CheckoutForm } from "../checkout-form";
import { useCheckoutForm } from "@/modules/payments/hooks/use-checkout-form";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createMockForm(overrides: Record<string, unknown> = {}) {
	return {
		state: {
			values: {
				email: "",
				shipping: {
					fullName: "",
					addressLine1: "",
					addressLine2: "",
					city: "",
					postalCode: "",
					country: "FR",
					phoneNumber: "",
				},
				_appliedDiscount: null,
				_selectedAddressId: null,
				_showAddressLine2: false,
				_discountOpen: false,
				termsAccepted: false,
				discountCode: "",
			},
		},
		setFieldValue: vi.fn(),
		handleSubmit: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (state: unknown) => React.ReactNode;
			selector: (s: unknown) => unknown;
		}) =>
			children(
				selector({
					values: {
						email: "",
						shipping: {
							fullName: "",
							addressLine1: "",
							addressLine2: "",
							city: "",
							postalCode: "",
							country: "FR",
							phoneNumber: "",
						},
						_appliedDiscount: null,
						_selectedAddressId: null,
						_showAddressLine2: false,
						_discountOpen: false,
						termsAccepted: false,
						discountCode: "",
					},
					canSubmit: true,
					submissionAttempts: 0,
					fieldMeta: {},
				}),
			),
		AppField: ({ children }: { children: (field: unknown) => React.ReactNode }) =>
			children({
				InputField: () => null,
				CheckboxField: () => null,
				SelectField: () => null,
				PhoneField: () => null,
				state: { value: "", meta: { errors: [], isValidating: false } },
				handleBlur: vi.fn(),
			}),
		...overrides,
	};
}

function createMockCart() {
	return {
		id: "cart-1",
		items: [
			{
				id: "item-1",
				sku: { id: "sku-1" },
				quantity: 1,
				priceAtAdd: 4500,
			},
		],
	};
}

function createMockSession() {
	return {
		user: {
			id: "user-1",
			email: "test@example.com",
			name: "Test User",
		},
	};
}

afterEach(cleanup);

beforeEach(() => {
	vi.mocked(useCheckoutForm).mockReturnValue({
		form: createMockForm() as unknown as ReturnType<typeof useCheckoutForm>["form"],
		action: vi.fn() as ReturnType<typeof useCheckoutForm>["action"],
		isPending: false,
		state: undefined,
	});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CheckoutForm", () => {
	describe("step display", () => {
		it("shows address step by default", () => {
			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			expect(screen.getByText("Adresse de livraison")).toBeInTheDocument();
			expect(screen.queryByTestId("payment-step")).toBeNull();
		});

		it("shows checkout summary alongside the form", () => {
			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			expect(screen.getByTestId("checkout-summary")).toBeInTheDocument();
		});

		it("renders accessible sr-only heading", () => {
			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			const heading = screen.getByRole("heading", { name: "Paiement sécurisé" });
			expect(heading).toBeInTheDocument();
			expect(heading.className).toContain("sr-only");
		});
	});

	describe("offline detection", () => {
		it("does not show offline banner when online", () => {
			vi.stubGlobal("navigator", { onLine: true });

			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			expect(screen.queryByText("Connexion internet perdue")).toBeNull();

			vi.unstubAllGlobals();
		});

		it("shows offline banner when navigator.onLine is false", () => {
			vi.stubGlobal("navigator", { onLine: false });

			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			expect(screen.getByText("Connexion internet perdue")).toBeInTheDocument();

			vi.unstubAllGlobals();
		});
	});

	describe("useCheckoutForm integration", () => {
		it("calls useCheckoutForm with session and addresses", () => {
			const session = createMockSession();
			const addresses = [
				{
					id: "addr-1",
					userId: "user-1",
					firstName: "Test",
					lastName: "User",
					address1: "1 rue Test",
					address2: null,
					postalCode: "75001",
					city: "Paris",
					country: "FR",
					phone: "",
					isDefault: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			render(
				<CheckoutForm
					cart={createMockCart() as never}
					session={session as never}
					addresses={addresses as never}
				/>,
			);

			expect(useCheckoutForm).toHaveBeenCalledWith(
				expect.objectContaining({
					session,
					addresses,
					onSuccess: expect.any(Function),
				}),
			);
		});
	});
});
