import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockApproveDialog, mockProcessDialog, mockRejectDialog, mockCancelDialog } = vi.hoisted(
	() => ({
		mockApproveDialog: { open: vi.fn(), close: vi.fn(), isOpen: false, data: null },
		mockProcessDialog: { open: vi.fn(), close: vi.fn(), isOpen: false, data: null },
		mockRejectDialog: { open: vi.fn(), close: vi.fn(), isOpen: false, data: null },
		mockCancelDialog: { open: vi.fn(), close: vi.fn(), isOpen: false, data: null },
	}),
);

vi.mock("@/app/generated/prisma/browser", () => ({
	RefundStatus: {
		PENDING: "PENDING",
		APPROVED: "APPROVED",
		COMPLETED: "COMPLETED",
		REJECTED: "REJECTED",
		CANCELLED: "CANCELLED",
	} as const,
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: (id: string) => {
		if (id === "approve-refund") return mockApproveDialog;
		if (id === "process-refund") return mockProcessDialog;
		if (id === "reject-refund") return mockRejectDialog;
		if (id === "cancel-refund") return mockCancelDialog;
		return { open: vi.fn(), close: vi.fn(), isOpen: false, data: null };
	},
}));

vi.mock("../approve-refund-alert-dialog", () => ({
	APPROVE_REFUND_DIALOG_ID: "approve-refund",
}));

vi.mock("../process-refund-alert-dialog", () => ({
	PROCESS_REFUND_DIALOG_ID: "process-refund",
}));

vi.mock("../reject-refund-alert-dialog", () => ({
	REJECT_REFUND_DIALOG_ID: "reject-refund",
}));

vi.mock("../cancel-refund-alert-dialog", () => ({
	CANCEL_REFUND_DIALOG_ID: "cancel-refund",
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} {...(props as Record<string, unknown>)}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
		asChild,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		asChild?: boolean;
		className?: string;
	}) => (
		<div role="menuitem" onClick={onClick} className={className}>
			{children}
		</div>
	),
}));

vi.mock("lucide-react", () => ({
	Check: () => <svg data-testid="icon-check" />,
	CreditCard: () => <svg data-testid="icon-credit-card" />,
	Eye: () => <svg data-testid="icon-eye" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { RefundRowActions } from "../refund-row-actions";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function createRefund(
	overrides: Partial<{
		id: string;
		status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "FAILED";
		amount: number;
		orderId: string;
		orderNumber: string;
	}> = {},
) {
	return {
		id: "refund-1",
		status: "PENDING" as const,
		amount: 2500,
		orderId: "order-1",
		orderNumber: "CMD-001",
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("RefundRowActions", () => {
	describe("trigger button", () => {
		it("renders trigger button with 'Actions' aria-label", () => {
			render(<RefundRowActions refund={createRefund()} />);
			expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
		});
	});

	describe("'Voir la commande' link", () => {
		it("always shows 'Voir la commande' link", () => {
			render(<RefundRowActions refund={createRefund()} />);
			expect(screen.getByText("Voir la commande")).toBeInTheDocument();
		});

		it("link points to the correct order admin URL", () => {
			render(<RefundRowActions refund={createRefund({ orderId: "order-abc" })} />);
			const link = screen.getByText("Voir la commande").closest("a");
			expect(link).toHaveAttribute("href", "/admin/ventes/commandes/order-abc");
		});
	});

	describe("PENDING status", () => {
		it("shows 'Approuver' when status is PENDING", () => {
			render(<RefundRowActions refund={createRefund({ status: "PENDING" })} />);
			expect(screen.getByText("Approuver")).toBeInTheDocument();
		});

		it("shows 'Refuser' when status is PENDING", () => {
			render(<RefundRowActions refund={createRefund({ status: "PENDING" })} />);
			expect(screen.getByText("Refuser")).toBeInTheDocument();
		});

		it("shows 'Annuler la demande' when status is PENDING", () => {
			render(<RefundRowActions refund={createRefund({ status: "PENDING" })} />);
			expect(screen.getByText("Annuler la demande")).toBeInTheDocument();
		});

		it("hides 'Traiter le remboursement' when status is PENDING", () => {
			render(<RefundRowActions refund={createRefund({ status: "PENDING" })} />);
			expect(screen.queryByText("Traiter le remboursement")).not.toBeInTheDocument();
		});
	});

	describe("APPROVED status", () => {
		it("shows 'Traiter le remboursement' when status is APPROVED", () => {
			render(<RefundRowActions refund={createRefund({ status: "APPROVED" })} />);
			expect(screen.getByText("Traiter le remboursement")).toBeInTheDocument();
		});

		it("shows 'Annuler la demande' when status is APPROVED", () => {
			render(<RefundRowActions refund={createRefund({ status: "APPROVED" })} />);
			expect(screen.getByText("Annuler la demande")).toBeInTheDocument();
		});

		it("hides 'Approuver' when status is APPROVED", () => {
			render(<RefundRowActions refund={createRefund({ status: "APPROVED" })} />);
			expect(screen.queryByText("Approuver")).not.toBeInTheDocument();
		});
	});

	describe("COMPLETED status", () => {
		it("hides all action items when status is COMPLETED, only 'Voir la commande' visible", () => {
			render(<RefundRowActions refund={createRefund({ status: "COMPLETED" })} />);
			expect(screen.getByText("Voir la commande")).toBeInTheDocument();
			expect(screen.queryByText("Approuver")).not.toBeInTheDocument();
			expect(screen.queryByText("Traiter le remboursement")).not.toBeInTheDocument();
			expect(screen.queryByText("Refuser")).not.toBeInTheDocument();
			expect(screen.queryByText("Annuler la demande")).not.toBeInTheDocument();
		});
	});
});
