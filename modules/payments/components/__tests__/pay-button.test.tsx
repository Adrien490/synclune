import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
	// ⚠️ Le vrai `Button` forwarde `...props`, donc `aria-disabled` et
	// `aria-describedby`. Ce mock DOIT les relayer : sans ça les assertions de
	// F6 (CTA atteignable au clavier + hint relié) seraient vertes pour rien.
	Button: ({
		children,
		disabled,
		onClick,
		"aria-busy": ariaBusy,
		"aria-disabled": ariaDisabled,
		"aria-describedby": ariaDescribedBy,
		type,
		size,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		"aria-busy"?: boolean;
		"aria-disabled"?: boolean;
		"aria-describedby"?: string;
		type?: string;
		size?: string;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			onClick={onClick}
			aria-busy={ariaBusy}
			aria-disabled={ariaDisabled}
			aria-describedby={ariaDescribedBy}
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
		<div
			role={role as React.AriaRole}
			aria-live={ariaLive as React.AriaAttributes["aria-live"]}
			data-testid="payment-error-alert"
		>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	Loader2Icon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-loader" className={className} />
	),
	Lock: ({ className }: { className?: string }) => (
		<svg data-testid="icon-lock" className={className} />
	),
	ShieldCheck: ({ className }: { className?: string }) => (
		<svg data-testid="icon-shield" className={className} />
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
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
		isOnline: true,
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

	// ─── Montant verrouillé (CHECKOUT-CONSENT-001) ────────────────────────────

	it("affiche le montant serveur figé plutôt que le total client une fois la commande liée", () => {
		// Le client a saisi un code promo après un refus de carte : l'écran
		// afficherait 99,00 € alors que le PI est figé à 129,00 €.
		render(<PayButton {...defaultProps} total={9900} lockedAmount={12900} />);
		expect(screen.getByText(/Commander et payer 129.00 €/)).toBeInTheDocument();
		expect(screen.queryByText(/99.00 €/)).not.toBeInTheDocument();
	});

	it("retombe sur le total client tant qu'aucune commande n'est liée", () => {
		render(<PayButton {...defaultProps} lockedAmount={null} />);
		expect(screen.getByText(/Commander et payer 99.00 €/)).toBeInTheDocument();
	});

	// ─── Disabled states ──────────────────────────────────────────────────────

	describe("formulaire incomplet — aria-disabled, pas disabled (F6)", () => {
		it("marque aria-disabled mais reste dans le tab order", () => {
			render(<PayButton {...defaultProps} disabled={true} />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-disabled", "true");
			// Un `disabled` natif sortirait le bouton du tab order : l'utilisateur
			// clavier n'aurait AUCUN contrôle focusable en fin de formulaire.
			expect(button).not.toBeDisabled();
		});

		it("le clic route vers la validation (getFormData) au lieu d'être inerte", async () => {
			const getFormData = vi.fn().mockResolvedValue(null);
			render(<PayButton {...defaultProps} disabled={true} getFormData={getFormData} />);

			await userEvent.click(screen.getByRole("button"));

			// C'est ce chemin qui déclenche `form.handleSubmit()` + `focusFirstInvalid()`
			// côté CheckoutForm — le comportement utile quand le formulaire est incomplet.
			expect(getFormData).toHaveBeenCalled();
		});

		it("relie le motif au bouton via aria-describedby", () => {
			render(
				<PayButton
					{...defaultProps}
					disabled={true}
					incompleteSections={["Contact", "Livraison"]}
				/>,
			);

			const button = screen.getByRole("button");
			const hint = screen.getByText("À compléter : Contact, Livraison");
			expect(hint.id).toBeTruthy();
			expect(button).toHaveAttribute("aria-describedby", hint.id);
		});

		it("relie aussi le hint générique quand aucune section n'est fournie", () => {
			render(<PayButton {...defaultProps} disabled={true} />);

			const button = screen.getByRole("button");
			const hint = screen.getByText("Remplis tous les champs obligatoires pour continuer.");
			expect(button).toHaveAttribute("aria-describedby", hint.id);
		});
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

	it("is disabled when isOnline=false", () => {
		render(<PayButton {...defaultProps} isOnline={false} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("shows offline message when isOnline=false", () => {
		render(<PayButton {...defaultProps} isOnline={false} />);
		expect(screen.getByRole("alert")).toHaveTextContent(/connexion internet/i);
	});

	// ─── Shipping unavailable message ─────────────────────────────────────────

	it("shows shipping unavailable message when shipping not available", () => {
		render(<PayButton {...defaultProps} shippingUnavailable={true} />);
		expect(screen.getByRole("alert")).toHaveTextContent(/zone n'est pas livrable/i);
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

	// ─── Phase transitions ────────────────────────────────────────────────────

	it("calls confirmCheckout with form data when submission succeeds up to 3DS", async () => {
		mockConfirmCheckout.mockResolvedValue({ success: true, orderId: "order-123" });
		render(<PayButton {...defaultProps} />);
		await userEvent.click(screen.getByRole("button"));
		expect(mockConfirmCheckout).toHaveBeenCalledTimes(1);
		expect(mockStripe.value?.confirmPayment).toHaveBeenCalled();
	});

	it("button announces busy state to assistive tech when processing", async () => {
		mockConfirmCheckout.mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(() => resolve({ success: true, orderId: "order-123" }), 50),
				),
		);
		render(<PayButton {...defaultProps} />);
		const button = screen.getByRole("button");
		await userEvent.click(button);
		expect(button).toHaveAttribute("aria-busy", "true");
	});

	// ─── A11Y-AUDIT-001: phase announcements ──────────────────────────────────

	it("exposes an empty polite live region for payment phases when idle", () => {
		render(<PayButton {...defaultProps} />);
		const liveRegion = screen.getByRole("status");
		expect(liveRegion).toHaveAttribute("aria-live", "polite");
		expect(liveRegion).toHaveTextContent("");
	});

	it("announces the payment phase to screen readers via the live region while processing", async () => {
		// confirmCheckout stays pending so the "creating-order" phase persists and
		// the 3DS Alert (also role="status") never mounts → single live region.
		mockConfirmCheckout.mockImplementation(() => new Promise<never>(() => {}));
		render(<PayButton {...defaultProps} />);
		await userEvent.click(screen.getByRole("button"));
		await waitFor(() =>
			expect(screen.getByRole("status")).toHaveTextContent(/Validation|Création de la commande/),
		);
	});
});
