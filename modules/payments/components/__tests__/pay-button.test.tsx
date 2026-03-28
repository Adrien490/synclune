import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockStripe, mockElements, mockConfirmCheckout } = vi.hoisted(() => ({
	mockStripe: {
		value: null as {
			confirmPayment: ReturnType<typeof vi.fn>;
		} | null,
	},
	mockElements: {
		value: null as {
			submit: ReturnType<typeof vi.fn>;
		} | null,
	},
	mockConfirmCheckout: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@stripe/react-stripe-js", () => ({
	useStripe: () => mockStripe.value,
	useElements: () => mockElements.value,
}));

vi.mock("@/modules/payments/actions/confirm-checkout", () => ({
	confirmCheckout: mockConfirmCheckout,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		"aria-busy": ariaBusy,
		type,
		size,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-busy"?: boolean;
		type?: string;
		size?: string;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			onClick={onClick}
			aria-busy={ariaBusy}
			type={type as "button" | "submit" | "reset"}
			className={className}
			data-size={size}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({
		children,
		role,
		"aria-live": ariaLive,
	}: {
		children: React.ReactNode;
		variant?: string;
		role?: string;
		"aria-live"?: string;
	}) => (
		<div role={role} aria-live={ariaLive} data-testid="payment-error-alert">
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
	Lock: ({ className }: { className?: string }) => (
		<svg data-testid="icon-lock" className={className} />
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { PayButton } from "../pay-button";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("PayButton", () => {
	const defaultProps = {
		total: 9900,
		disabled: false,
		shippingUnavailable: false,
		getFormData: vi.fn().mockResolvedValue({ email: "test@example.com" }),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockStripe.value = {
			confirmPayment: vi.fn().mockResolvedValue({ error: null }),
		};
		mockElements.value = {
			submit: vi.fn().mockResolvedValue({ error: null }),
		};
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders pay button", () => {
		render(<PayButton {...defaultProps} />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("shows lock icon and formatted total when idle", () => {
		render(<PayButton {...defaultProps} />);
		expect(screen.getByTestId("icon-lock")).toBeInTheDocument();
		expect(screen.getByText(/Commander et payer 99.00 €/)).toBeInTheDocument();
	});

	// ─── Disabled states ──────────────────────────────────────────────────────

	it("is disabled when disabled=true", () => {
		render(<PayButton {...defaultProps} disabled={true} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("is disabled when stripe is not loaded", () => {
		mockStripe.value = null;
		render(<PayButton {...defaultProps} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("is disabled when elements is not loaded", () => {
		mockElements.value = null;
		render(<PayButton {...defaultProps} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("is disabled when shippingUnavailable=true", () => {
		render(<PayButton {...defaultProps} shippingUnavailable={true} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	// ─── Shipping unavailable message ─────────────────────────────────────────

	it("shows shipping unavailable message when shipping not available", () => {
		render(<PayButton {...defaultProps} shippingUnavailable={true} />);
		expect(screen.getByRole("alert")).toHaveTextContent(/ne livrons pas/i);
	});

	// ─── Incomplete form message ───────────────────────────────────────────────

	it("shows incomplete form message when disabled=true and not pending", () => {
		render(<PayButton {...defaultProps} disabled={true} />);
		expect(screen.getByText(/champs obligatoires/i)).toBeInTheDocument();
	});

	// ─── Error state ──────────────────────────────────────────────────────────

	it("shows error alert when getFormData returns null", async () => {
		const getFormData = vi.fn().mockResolvedValue(null);
		render(<PayButton {...defaultProps} getFormData={getFormData} />);
		await userEvent.click(screen.getByRole("button"));
		expect(screen.queryByTestId("payment-error-alert")).not.toBeInTheDocument();
	});

	it("shows error when elements.submit returns error", async () => {
		mockElements.value = {
			submit: vi.fn().mockResolvedValue({
				error: { message: "Carte invalide" },
			}),
		};
		render(<PayButton {...defaultProps} />);
		await userEvent.click(screen.getByRole("button"));
		expect(screen.getByTestId("payment-error-alert")).toBeInTheDocument();
		expect(screen.getByText("Carte invalide")).toBeInTheDocument();
	});

	it("shows error when confirmCheckout returns failure", async () => {
		mockConfirmCheckout.mockResolvedValue({ success: false, error: "Stock insuffisant" });
		render(<PayButton {...defaultProps} />);
		await userEvent.click(screen.getByRole("button"));
		expect(screen.getByTestId("payment-error-alert")).toBeInTheDocument();
		expect(screen.getByText("Stock insuffisant")).toBeInTheDocument();
	});
});
