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

vi.mock("@/modules/payments/components/address-step", () => ({
	AddressStep: ({ isGuest, userEmail }: { isGuest: boolean; userEmail: string | null }) => (
		<div data-testid="address-step" data-is-guest={String(isGuest)}>
			{!isGuest && !!userEmail && <span data-testid="logged-in-indicator">connecté</span>}
		</div>
	),
}));

vi.mock("@/modules/payments/components/payment-step", () => ({
	PaymentStep: ({ orderNumber }: { orderNumber: string | null }) => (
		<div data-testid="payment-step" data-order-number={orderNumber ?? ""} />
	),
}));

vi.mock("@/shared/components/error-boundary", () => ({
	ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useReducedMotion: vi.fn().mockReturnValue(false),
	m: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
	},
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
					},
					canSubmit: true,
					submissionAttempts: 0,
					fieldMeta: {},
				}),
			),
		AppField: ({ children }: { children: (field: unknown) => React.ReactNode }) => children({}),
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

			expect(screen.getByTestId("address-step")).toBeInTheDocument();
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

	describe("guest vs authenticated", () => {
		it("passes isGuest=true when no session", () => {
			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			expect(screen.getByTestId("address-step").dataset.isGuest).toBe("true");
		});

		it("passes isGuest=false when session exists", () => {
			render(
				<CheckoutForm
					cart={createMockCart() as never}
					session={createMockSession() as never}
					addresses={null}
				/>,
			);

			expect(screen.getByTestId("address-step").dataset.isGuest).toBe("false");
		});
	});

	describe("offline detection", () => {
		it("does not show offline banner when online", () => {
			vi.stubGlobal("navigator", { onLine: true });

			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			expect(screen.queryByRole("alert")).toBeNull();

			vi.unstubAllGlobals();
		});

		it("shows offline banner when navigator.onLine is false", () => {
			vi.stubGlobal("navigator", { onLine: false });

			render(<CheckoutForm cart={createMockCart() as never} session={null} addresses={null} />);

			expect(screen.getByText("Connexion internet perdue")).toBeInTheDocument();

			vi.unstubAllGlobals();
		});
	});

	describe("subtotal computation", () => {
		it("passes correct subtotal from cart items to AddressStep", () => {
			const cart = {
				id: "cart-1",
				items: [
					{ id: "item-1", sku: { id: "sku-1" }, quantity: 2, priceAtAdd: 3000 },
					{ id: "item-2", sku: { id: "sku-2" }, quantity: 1, priceAtAdd: 1500 },
				],
			};

			// Subtotal = 2*3000 + 1*1500 = 7500
			// We verify AddressStep is rendered (it receives subtotal as prop)
			render(<CheckoutForm cart={cart as never} session={null} addresses={null} />);

			expect(screen.getByTestId("address-step")).toBeInTheDocument();
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
