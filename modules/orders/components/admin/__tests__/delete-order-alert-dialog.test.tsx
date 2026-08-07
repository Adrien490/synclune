import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockClose, mockAction, mockRouterReplace } = vi.hoisted(() => ({
	mockClose: vi.fn(),
	mockAction: vi.fn(),
	mockRouterReplace: vi.fn(),
}));

// Le dialog navigue après suppression quand `successPath` est fourni (montage sur la
// page détail, qui porte l'entité supprimée). Sans ce mock : « invariant expected app
// router to be mounted ».
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockRouterReplace, push: vi.fn() }),
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

// On capture `onSuccess` pour pouvoir déclencher le chemin « suppression réussie »
// depuis le test (c'est là que vit la redirection).
const capturedOnSuccess: { current: (() => void) | undefined } = { current: undefined };

vi.mock("@/modules/orders/hooks/use-delete-order", () => ({
	useDeleteOrder: ({ onSuccess }: { onSuccess?: () => void } = {}) => {
		capturedOnSuccess.current = onSuccess;
		return {
			action: mockAction,
			isPending: mockIsPending,
			onSuccess,
		};
	},
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

import { DeleteOrderAlertDialog } from "../delete-order-alert-dialog";

// ============================================================================
// TESTS
// ============================================================================

describe("DeleteOrderAlertDialog", () => {
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

		render(<DeleteOrderAlertDialog />);

		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	it("renders title when dialog is open", () => {
		render(<DeleteOrderAlertDialog />);

		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
	});

	// ─── Description ──────────────────────────────────────────────────────────

	it("shows the order number in the description", () => {
		render(<DeleteOrderAlertDialog />);

		expect(screen.getByText("CMD-2026-001")).toBeInTheDocument();
	});

	it("shows irreversible warning", () => {
		render(<DeleteOrderAlertDialog />);

		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
	});

	// ─── Hidden input ─────────────────────────────────────────────────────────

	it("hidden input id contains the orderId", () => {
		render(<DeleteOrderAlertDialog />);

		const input = document.querySelector('input[name="id"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe("order_1");
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	/**
	 * Ce dialogue ne décore plus l'attente (libellé « Suppression… », spinner,
	 * `aria-busy`, `disabled` sur l'annulation) : le bouton de confirmation est un
	 * `Close` Base UI, donc la surface part AU CLIC, avant que `isPending` ne
	 * passe. La décoration se jouait dans un dialog déjà en sortie, et seuls ces
	 * tests — qui forçaient `mockIsPending = true` à la main — la voyaient.
	 * Prouvé par `shared/components/ui/__tests__/alert-dialog-close-on-confirm.regression.test.tsx` ;
	 * le retour d'attente appartient au toast de la mutation.
	 */
	it("ne décore pas l'attente : rien ne dépend d'`isPending`", () => {
		mockIsPending = true;

		render(<DeleteOrderAlertDialog />);

		// Le bouton reste désactivé, mais à cause du MOTIF manquant — pas d'`isPending`.
		expect(screen.getByTestId("submit-button")).toHaveTextContent("Supprimer");
		expect(screen.getByTestId("cancel-button")).not.toBeDisabled();
	});

	// ─── Redirection post-suppression ─────────────────────────────────────────

	it("redirects to successPath after a successful delete (page détail)", () => {
		// Monté sur la page détail, le dialog supprime l'entité que porte la page :
		// rester dessus laisserait l'admin sur une page morte.
		render(<DeleteOrderAlertDialog successPath="/admin/ventes/commandes" />);

		capturedOnSuccess.current?.();

		expect(mockRouterReplace).toHaveBeenCalledWith("/admin/ventes/commandes");
	});

	it("does not redirect when no successPath is given (page liste)", () => {
		render(<DeleteOrderAlertDialog />);

		capturedOnSuccess.current?.();

		// La fermeture n'est plus l'affaire d'`onSuccess` : le bouton de confirmation
		// est un `Close`, le dialog est déjà parti quand la mutation aboutit.
		// `onSuccess` ne garde que ce qui lui appartient — ici, la redirection.
		expect(mockRouterReplace).not.toHaveBeenCalled();
	});
});
