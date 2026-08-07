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

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
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

import { MarkAsProcessingAlertDialog } from "../mark-as-processing-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("MarkAsProcessingAlertDialog", () => {
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

		render(<MarkAsProcessingAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open", () => {
		render(<MarkAsProcessingAlertDialog />);

		expect(screen.getByRole("heading", { name: "Passer en préparation" })).toBeInTheDocument();
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows the order number in the description", () => {
		render(<MarkAsProcessingAlertDialog />);

		expect(screen.getByText("CMD-2026-001")).toBeInTheDocument();
	});

	it("shows 'en préparation' context in the description", () => {
		render(<MarkAsProcessingAlertDialog />);

		expect(screen.getAllByText(/en préparation/).length).toBeGreaterThanOrEqual(1);
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("hidden input id contains the orderId", () => {
		render(<MarkAsProcessingAlertDialog />);

		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("order_1");
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	/**
	 * Ce dialogue ne décore plus l'attente (libellé « Passage… », spinner,
	 * `aria-busy`, `disabled` sur l'annulation) : le bouton de confirmation est un
	 * `Close` Base UI, donc la surface part AU CLIC, avant que `isPending` ne
	 * passe. La décoration se jouait dans un dialog déjà en sortie, et seuls ces
	 * tests — qui forçaient `mockIsPending = true` à la main — la voyaient.
	 * Prouvé par `shared/components/ui/__tests__/alert-dialog-close-on-confirm.regression.test.tsx` ;
	 * le retour d'attente appartient au toast de la mutation.
	 */
	it("ne décore pas l'attente : rien ne dépend d'`isPending`", () => {
		mockIsPending = true;

		render(<MarkAsProcessingAlertDialog />);

		expect(screen.getByTestId("submit-button")).toHaveTextContent("Passer en préparation");
		expect(screen.getByTestId("submit-button")).not.toBeDisabled();
		expect(screen.getByTestId("cancel-button")).not.toBeDisabled();
	});
});
