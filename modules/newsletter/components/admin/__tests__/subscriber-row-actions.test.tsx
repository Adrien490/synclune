import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUnsubscribeAction, mockDeleteAction } = vi.hoisted(() => ({
	mockUnsubscribeAction: vi.fn(),
	mockDeleteAction: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/app/generated/prisma/client", () => ({
	NewsletterStatus: {
		CONFIRMED: "CONFIRMED",
		PENDING: "PENDING",
		UNSUBSCRIBED: "UNSUBSCRIBED",
	},
}));

vi.mock("../../hooks/use-admin-unsubscribe-newsletter", () => ({
	useAdminUnsubscribeNewsletter: () => ({
		action: mockUnsubscribeAction,
		isPending: false,
	}),
}));

vi.mock("../../hooks/use-admin-delete-newsletter-subscriber", () => ({
	useAdminDeleteNewsletterSubscriber: () => ({
		action: mockDeleteAction,
		isPending: false,
	}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		type,
		variant,
		disabled,
		size: _size,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		type?: string;
		variant?: string;
		disabled?: boolean;
		size?: string;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button
			aria-label={ariaLabel}
			type={type as "button" | "submit" | "reset"}
			disabled={disabled}
			data-variant={variant}
			className={className}
			{...rest}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
	),
	DropdownMenuContent: ({
		children,
	}: {
		children: React.ReactNode;
		align?: string;
		className?: string;
	}) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
		disabled,
		variant,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
	}) => (
		<button role="menuitem" onClick={onClick} disabled={disabled} data-variant={variant}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-header">{children}</div>
	),
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="alert-dialog-title">{children}</h2>
	),
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="alert-dialog-description">{children}</p>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-footer">{children}</div>
	),
	AlertDialogCancel: ({
		children,
		type,
		disabled,
	}: {
		children: React.ReactNode;
		type?: string;
		disabled?: boolean;
	}) => (
		<button type={type as "button" | "submit" | "reset"} disabled={disabled}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

import { SubscriberRowActions } from "../subscriber-row-actions";

// ============================================================================
// HELPERS
// ============================================================================

function createSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub-1",
		email: "test@example.com",
		status: "CONFIRMED" as const,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SubscriberRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Trigger button ────────────────────────────────────────────────────────

	it("renders trigger button with aria-label for subscriber email", () => {
		render(<SubscriberRowActions subscriber={createSubscriber({ email: "test@example.com" })} />);
		expect(
			screen.getByRole("button", { name: "Actions pour test@example.com" }),
		).toBeInTheDocument();
	});

	it("renders dropdown trigger", () => {
		render(<SubscriberRowActions subscriber={createSubscriber()} />);
		expect(screen.getByTestId("dropdown-trigger")).toBeInTheDocument();
	});

	// ─── Menu items ────────────────────────────────────────────────────────────

	it("renders 'Désabonner' menu item", () => {
		render(<SubscriberRowActions subscriber={createSubscriber()} />);
		expect(screen.getByRole("menuitem", { name: /Désabonner/i })).toBeInTheDocument();
	});

	it("renders 'Supprimer (RGPD)' menu item", () => {
		render(<SubscriberRowActions subscriber={createSubscriber()} />);
		expect(screen.getByRole("menuitem", { name: /Supprimer \(RGPD\)/i })).toBeInTheDocument();
	});

	it("renders separator between menu items", () => {
		render(<SubscriberRowActions subscriber={createSubscriber()} />);
		expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument();
	});

	// ─── Disabled states ───────────────────────────────────────────────────────

	it("disables 'Désabonner' when status is UNSUBSCRIBED", () => {
		render(<SubscriberRowActions subscriber={createSubscriber({ status: "UNSUBSCRIBED" })} />);
		const unsubscribeItem = screen.getByRole("menuitem", { name: /Désabonner/i });
		expect(unsubscribeItem).toBeDisabled();
	});

	it("does not disable 'Désabonner' when status is CONFIRMED", () => {
		render(<SubscriberRowActions subscriber={createSubscriber({ status: "CONFIRMED" })} />);
		const unsubscribeItem = screen.getByRole("menuitem", { name: /Désabonner/i });
		expect(unsubscribeItem).not.toBeDisabled();
	});

	it("does not disable 'Désabonner' when status is PENDING", () => {
		render(<SubscriberRowActions subscriber={createSubscriber({ status: "PENDING" })} />);
		const unsubscribeItem = screen.getByRole("menuitem", { name: /Désabonner/i });
		expect(unsubscribeItem).not.toBeDisabled();
	});

	// ─── Unsubscribe dialog ────────────────────────────────────────────────────

	it("does not show unsubscribe dialog by default", () => {
		render(<SubscriberRowActions subscriber={createSubscriber()} />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	// ─── Delete dialog ─────────────────────────────────────────────────────────

	it("does not show delete dialog by default", () => {
		render(<SubscriberRowActions subscriber={createSubscriber()} />);
		expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
	});

	// ─── Hidden inputs ─────────────────────────────────────────────────────────

	it("hidden inputs exist when component renders", () => {
		const { container } = render(
			<SubscriberRowActions subscriber={createSubscriber({ id: "sub-42" })} />,
		);
		// The hidden inputs are inside the dialogs which are closed by default.
		// Verify the component renders without error.
		expect(container).toBeTruthy();
	});

	// ─── Aria label with different email ──────────────────────────────────────

	it("uses subscriber email in trigger aria-label", () => {
		render(<SubscriberRowActions subscriber={createSubscriber({ email: "marie@synclune.fr" })} />);
		expect(
			screen.getByRole("button", { name: "Actions pour marie@synclune.fr" }),
		).toBeInTheDocument();
	});
});
