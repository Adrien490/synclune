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

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialogState,
}));

vi.mock("@/modules/orders/hooks/use-mark-as-returned", () => ({
	useMarkAsReturned: ({ onSuccess }: { onSuccess?: () => void } = {}) => ({
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

vi.mock("lucide-react", async (importOriginal) => ({
	...((await importOriginal()) as Record<string, unknown>),
	LoaderCircle: ({ className }: { className?: string }) => (
		<span data-testid="loader" className={className} />
	),
	RotateCcw: ({ className }: { className?: string }) => (
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

	it("shows 'Marquage…' on submit button when isPending is true", () => {
		mockIsPending = true;

		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByText("Marquage…")).toBeInTheDocument();
	});

	it("disables cancel button when isPending is true", () => {
		mockIsPending = true;

		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByTestId("cancel-button")).toBeDisabled();
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

	it("shows 'Plus tard' cancel button in refund prompt view", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				orderId: "order_1",
				orderNumber: "CMD-2026-001",
				showRefundPrompt: true,
			},
		};

		render(<MarkAsReturnedAlertDialog />);

		expect(screen.getByText("Plus tard")).toBeInTheDocument();
	});

	it("shows 'Créer un remboursement' link with correct href in refund prompt view", () => {
		mockDialogState = {
			...mockDialogState,
			data: {
				orderId: "order_1",
				orderNumber: "CMD-2026-001",
				showRefundPrompt: true,
			},
		};

		render(<MarkAsReturnedAlertDialog />);

		const link = screen.getByText("Créer un remboursement").closest("a");
		expect(link).toBeTruthy();
		expect(link?.getAttribute("href")).toBe("/admin/ventes/remboursements/nouveau?orderId=order_1");
	});
});
