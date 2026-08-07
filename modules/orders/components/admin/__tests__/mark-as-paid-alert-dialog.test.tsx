import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockAction } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockAction: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	data: {
		orderId: "order_1",
		orderNumber: "CMD-2026-001",
	} as Record<string, unknown> | null,
};

let mockIsPending = false;

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/orders/hooks/use-mark-as-paid", () => ({
	useMarkAsPaid: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
		action: mockAction,
		isPending: mockIsPending,
		onSuccess,
	}),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => (
		<button
			data-testid="cancel-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
		>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		type,
		"aria-busy": ariaBusy,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		"aria-busy"?: boolean;
	}) => (
		<button
			data-testid="submit-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
			aria-busy={ariaBusy}
		>
			{children}
		</button>
	),
}));

vi.mock("@phosphor-icons/react/ssr", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	SpinnerIcon: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
}));

import { MarkAsPaidAlertDialog } from "../mark-as-paid-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("MarkAsPaidAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			data: {
				orderId: "order_1",
				orderNumber: "CMD-2026-001",
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("does not render content when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<MarkAsPaidAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open", () => {
		render(<MarkAsPaidAlertDialog />);

		expect(screen.getByText("Confirmer le paiement manuel")).toBeInTheDocument();
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows the order number in the description", () => {
		render(<MarkAsPaidAlertDialog />);

		expect(screen.getByText("CMD-2026-001")).toBeInTheDocument();
	});

	it("shows description about virement/chèque", () => {
		render(<MarkAsPaidAlertDialog />);

		expect(screen.getByText(/paiements par virement ou chèque/)).toBeInTheDocument();
	});

	// ─── Attestation hors Stripe (EINV-CASH-002) ──────────────────────────────

	/**
	 * L'attestation EINV-CASH-002 était portée par le `required` HTML de la case.
	 * Ça ne pouvait pas marcher : le bouton de confirmation ferme le dialog au clic
	 * (`alert-dialog-close-on-confirm.regression.test.tsx`), donc la validation du
	 * navigateur bloquait la soumission dans une surface déjà disparue — l'admin
	 * voyait la confirmation s'évanouir sans rien obtenir. La garde est passée en
	 * JS : la confirmation reste désactivée tant que la case n'est pas cochée.
	 */
	it("bloque la confirmation tant que l'attestation hors Stripe n'est pas cochée", () => {
		render(<MarkAsPaidAlertDialog />);

		expect(screen.getByText(/hors Stripe/)).toBeInTheDocument();
		expect(screen.getByTestId("submit-button")).toBeDisabled();

		screen.getByRole("checkbox").click();

		expect(screen.getByTestId("submit-button")).not.toBeDisabled();
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("hidden input id contains the orderId", () => {
		render(<MarkAsPaidAlertDialog />);

		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("order_1");
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	/**
	 * Ce dialogue ne décore plus l'attente (libellé « Marquage… », spinner,
	 * `aria-busy`, `disabled` sur l'annulation) : le bouton de confirmation est un
	 * `Close` Base UI, donc la surface part AU CLIC, avant que `isPending` ne
	 * passe. La décoration se jouait dans un dialog déjà en sortie, et seuls ces
	 * tests — qui forçaient `mockIsPending = true` à la main — la voyaient.
	 * Prouvé par `shared/components/ui/__tests__/alert-dialog-close-on-confirm.regression.test.tsx` ;
	 * le retour d'attente appartient au toast de la mutation.
	 */
	it("ne décore pas l'attente : rien ne dépend d'`isPending`", () => {
		mockIsPending = true;

		render(<MarkAsPaidAlertDialog />);

		// Le bouton reste désactivé, mais à cause de l'ATTESTATION non cochée — pas d'`isPending`.
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Marquer comme payée");
		expect(screen.getByTestId("cancel-button")).not.toBeDisabled();
	});
});
