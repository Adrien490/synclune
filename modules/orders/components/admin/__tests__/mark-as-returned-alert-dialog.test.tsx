import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockOpen, mockAction } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockOpen: vi.fn(),
	mockAction: vi.fn(),
}));

let mockDialogState = {
	isOpen: true,
	close: mockClose,
	open: mockOpen,
	data: {
		orderId: "order_1",
		orderNumber: "CMD-2026-001",
		showRefundPrompt: false,
	} as Record<string, unknown> | null,
};

let mockIsPending = false;

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/orders/hooks/use-update-order-status", () => ({
	useUpdateOrderStatus: (_transition: string, { onSuccess }: { onSuccess?: () => void } = {}) => ({
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
	AlertDialogTitle: ({ children }: { children: React.ReactNode; className?: string }) => (
		<h2>{children}</h2>
	),
	AlertDialogDescription: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div>{children}</div>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
		type,
		onClick,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		onClick?: () => void;
	}) => (
		<button
			data-testid="cancel-button"
			disabled={disabled}
			type={type as "button" | "submit" | undefined}
			onClick={onClick}
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

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, asChild: _asChild, ...props }: any) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href, onClick, ...props }: any) => (
		<a href={href} onClick={onClick} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@phosphor-icons/react/ssr", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	SpinnerIcon: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
	ArrowCounterClockwiseIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-rotate" className={className} />
	),
}));

import { MarkAsReturnedAlertDialog } from "../mark-as-returned-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("MarkAsReturnedAlertDialog", () => {
	beforeEach(() => {
		cleanup();
		vi.clearAllMocks();
		mockIsPending = false;
		mockDialogState = {
			isOpen: true,
			close: mockClose,
			open: mockOpen,
			data: {
				orderId: "order_1",
				orderNumber: "CMD-2026-001",
				showRefundPrompt: false,
			},
		};
	});

	// ─── Visibility ───────────────────────────────────────────────────────────

	it("does not render content when dialog is closed", () => {
		mockDialogState = { ...mockDialogState, isOpen: false };

		render(<MarkAsReturnedAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("shows 'Marquer comme retourné' title in default view", () => {
		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByRole("heading", { name: "Marquer comme retourné" })).toBeInTheDocument();
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows the order number in the description", () => {
		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByText("CMD-2026-001")).toBeInTheDocument();
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("hidden input id contains the orderId", () => {
		render(<MarkAsReturnedAlertDialog />);

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

		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByTestId("submit-button")).toHaveTextContent("Marquer comme retourné");
		expect(screen.getByTestId("submit-button")).not.toBeDisabled();
		expect(screen.getByTestId("cancel-button")).not.toBeDisabled();
	});

	// ─── Refund prompt view ───────────────────────────────────────────────────

	it("shows refund prompt view when showRefundPrompt is true", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				orderId: "order_1",
				orderNumber: "CMD-2026-001",
				showRefundPrompt: true,
			},
		};

		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByText("Commande retournée")).toBeInTheDocument();
	});

	// Lot 2 S3.3 : plus de création de remboursement in-app — le prompt post-retour
	// oriente vers le dashboard Stripe et se ferme d'un seul bouton.
	it("points to the Stripe dashboard in the refund prompt view (no in-app creation link)", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				orderId: "order_1",
				orderNumber: "CMD-2026-001",
				showRefundPrompt: true,
			},
		};

		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByText(/dashboard Stripe/)).toBeInTheDocument();
		expect(screen.getByText("Compris")).toBeInTheDocument();
		expect(screen.queryByText("Créer un remboursement")).toBeNull();
	});
});
