import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/users/hooks/use-cancel-account-deletion", () => ({
	useCancelAccountDeletion: vi.fn(() => ({
		action: vi.fn(),
		isPending: false,
	})),
}));

vi.mock("@/modules/users/hooks/use-delete-account", () => ({
	useDeleteAccount: vi.fn(() => ({
		action: vi.fn(),
		isPending: false,
		state: undefined,
	})),
}));

vi.mock("@/modules/users/hooks/use-export-user-data", () => ({
	useExportUserData: vi.fn(() => ({
		exportData: vi.fn(),
		isPending: false,
	})),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: vi.fn(() => ({
		isOpen: false,
		open: vi.fn(),
		close: vi.fn(),
		data: undefined,
	})),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		variant,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		variant?: string;
	}) => (
		<button disabled={disabled} onClick={onClick} data-variant={variant}>
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
		open: boolean;
		onOpenChange?: (v: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => <button disabled={disabled}>{children}</button>,
	AlertDialogAction: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => <button disabled={disabled}>{children}</button>,
	AlertDialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
		asChild ? <>{children}</> : <button data-testid="alert-dialog-trigger">{children}</button>,
}));

vi.mock("lucide-react", () => ({
	TriangleAlert: () => <svg data-testid="icon-triangle-alert" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { GdprSection } from "../gdpr-section";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("GdprSection", () => {
	// ─── Heading ──────────────────────────────────────────────────────────────

	it("renders 'Données personnelles' heading", () => {
		render(<GdprSection accountStatus="ACTIVE" daysRemaining={0} />);
		expect(screen.getByRole("heading", { name: /Données personnelles/i })).toBeInTheDocument();
	});

	it("has aria-labelledby pointing to heading id", () => {
		render(<GdprSection accountStatus="ACTIVE" daysRemaining={0} />);
		const section = document.querySelector("section[aria-labelledby='gdpr-heading']");
		expect(section).not.toBeNull();
	});

	// ─── Active status ────────────────────────────────────────────────────────

	it("shows 'Supprimer mon compte' section when status is ACTIVE", () => {
		render(<GdprSection accountStatus="ACTIVE" daysRemaining={0} />);
		expect(screen.getByRole("heading", { name: /Supprimer mon compte/i })).toBeInTheDocument();
	});

	it("shows 30-day delay description when status is ACTIVE", () => {
		render(<GdprSection accountStatus="ACTIVE" daysRemaining={0} />);
		expect(document.body.textContent).toContain("30 jours");
	});

	// ─── Data export (RGPD portability) ──────────────────────────────────────

	it("renders the export data button (RGPD portability)", () => {
		render(<GdprSection accountStatus="ACTIVE" daysRemaining={0} />);
		expect(screen.getByRole("button", { name: /Exporter mes données/i })).toBeInTheDocument();
	});

	it("renders the export data button even when status is PENDING_DELETION", () => {
		render(<GdprSection accountStatus="PENDING_DELETION" daysRemaining={15} />);
		expect(screen.getByRole("button", { name: /Exporter mes données/i })).toBeInTheDocument();
	});

	it("does not show CancelDeletionBanner when status is ACTIVE", () => {
		render(<GdprSection accountStatus="ACTIVE" daysRemaining={15} />);
		// CancelDeletionBanner renders a button with "Annuler la suppression"
		expect(screen.queryByText(/Annuler la suppression/i)).toBeNull();
	});

	// ─── Pending deletion status ──────────────────────────────────────────────

	it("shows CancelDeletionBanner when status is PENDING_DELETION with daysRemaining > 0", () => {
		render(<GdprSection accountStatus="PENDING_DELETION" daysRemaining={15} />);
		expect(document.body.textContent).toContain("15 jour");
	});

	it("does not show delete account section when status is PENDING_DELETION", () => {
		render(<GdprSection accountStatus="PENDING_DELETION" daysRemaining={15} />);
		expect(screen.queryByRole("heading", { name: /Supprimer mon compte/i })).toBeNull();
	});

	it("does not show CancelDeletionBanner when daysRemaining is 0 even if PENDING_DELETION", () => {
		render(<GdprSection accountStatus="PENDING_DELETION" daysRemaining={0} />);
		// Should not show the banner (condition: daysRemaining > 0)
		expect(screen.queryByText(/Annuler la suppression/i)).toBeNull();
	});
});
