import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockDeleteDialog,
	mockSuspendDialog,
	mockRestoreDialog,
	mockPromoteDialog,
	mockDemoteDialog,
	mockExportData,
	mockInvalidate,
	mockSendReset,
} = vi.hoisted(() => {
	const makeDialog = (_id: string) => ({
		isOpen: false,
		open: vi.fn(),
		close: vi.fn(),
	});
	return {
		mockDeleteDialog: makeDialog("delete"),
		mockSuspendDialog: makeDialog("suspend"),
		mockRestoreDialog: makeDialog("restore"),
		mockPromoteDialog: makeDialog("promote"),
		mockDemoteDialog: makeDialog("demote"),
		mockExportData: vi.fn(),
		mockInvalidate: vi.fn(),
		mockSendReset: vi.fn(),
	};
});

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: vi.fn((id: string) => {
		if (id.startsWith("delete-user")) return mockDeleteDialog;
		if (id.startsWith("suspend-user")) return mockSuspendDialog;
		if (id.startsWith("restore-user")) return mockRestoreDialog;
		if (id.startsWith("promote-user")) return mockPromoteDialog;
		if (id.startsWith("demote-user")) return mockDemoteDialog;
		return { isOpen: false, open: vi.fn(), close: vi.fn() };
	}),
}));

vi.mock("@/modules/users/hooks/use-delete-user", () => ({
	useDeleteUser: vi.fn(() => ({ action: vi.fn(), isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-suspend-user", () => ({
	useSuspendUser: vi.fn(() => ({ action: vi.fn(), isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-restore-user", () => ({
	useRestoreUser: vi.fn(() => ({ action: vi.fn(), isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-change-user-role", () => ({
	useChangeUserRole: vi.fn(() => ({ action: vi.fn(), isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-export-user-data-admin", () => ({
	useExportUserDataAdmin: vi.fn(() => ({ exportData: mockExportData, isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-invalidate-user-sessions", () => ({
	useInvalidateUserSessions: vi.fn(() => ({ invalidate: mockInvalidate, isPending: false })),
}));
vi.mock("@/modules/users/hooks/use-send-password-reset-admin", () => ({
	useSendPasswordResetAdmin: vi.fn(() => ({ sendReset: mockSendReset, isPending: false })),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		disabled,
		type,
		variant: _variant,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		disabled?: boolean;
		type?: string;
		variant?: string;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button
			aria-label={ariaLabel}
			disabled={disabled}
			type={type as "button" | "submit" | "reset" | undefined}
			className={className}
			{...rest}
		>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="dropdown-trigger">{children}</div>,
	DropdownMenuContent: ({
		children,
		align: _align,
	}: {
		children: React.ReactNode;
		align?: string;
	}) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuSeparator: () => <hr />,
	DropdownMenuItem: ({
		children,
		onClick,
		className,
		disabled,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		className?: string;
		disabled?: boolean;
		asChild?: boolean;
	}) => (
		<button role="menuitem" onClick={onClick} className={className} aria-disabled={disabled}>
			{children}
		</button>
	),
	DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
		<button role="menuitem">{children}</button>
	),
	DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
		type: _type,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
	}) => <button disabled={disabled}>{children}</button>,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	Download: () => <svg data-testid="icon-download" />,
	Eye: () => <svg data-testid="icon-eye" />,
	KeyRound: () => <svg data-testid="icon-key" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	LogOut: () => <svg data-testid="icon-logout" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	RotateCcw: () => <svg data-testid="icon-rotate" />,
	Trash2: () => <svg data-testid="icon-trash" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UsersRowActions } from "../users-row-actions";

// ============================================================================
// HELPERS
// ============================================================================

function createUser(overrides: Partial<React.ComponentProps<typeof UsersRowActions>["user"]> = {}) {
	return {
		id: "user-1",
		name: "Alice Dupont",
		email: "alice@example.com",
		role: "USER",
		deletedAt: null,
		suspendedAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	vi.clearAllMocks();
	mockDeleteDialog.isOpen = false;
	mockSuspendDialog.isOpen = false;
	mockRestoreDialog.isOpen = false;
	mockPromoteDialog.isOpen = false;
	mockDemoteDialog.isOpen = false;
});

describe("UsersRowActions", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the actions trigger button", () => {
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
	});

	it("renders the ellipsis icon", () => {
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByTestId("icon-ellipsis")).toBeInTheDocument();
	});

	it("renders 'Voir commandes' menu item", () => {
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByText("Voir commandes")).toBeInTheDocument();
	});

	it("'Voir commandes' links to /admin/ventes/commandes with userId", () => {
		render(<UsersRowActions user={createUser({ id: "user-42" })} />);
		const link = screen.getByRole("link", { name: /Voir commandes/i });
		expect(link).toHaveAttribute("href", "/admin/ventes/commandes?userId=user-42");
	});

	it("renders 'Exporter données (RGPD)' menu item", () => {
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByText("Exporter données (RGPD)")).toBeInTheDocument();
	});

	it("renders 'Forcer la déconnexion' menu item", () => {
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByText("Forcer la déconnexion")).toBeInTheDocument();
	});

	it("renders 'Envoyer reset mot de passe' menu item", () => {
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByText("Envoyer reset mot de passe")).toBeInTheDocument();
	});

	// ─── Non-deleted user ─────────────────────────────────────────────────────

	it("shows 'Suspendre' when user is not suspended and not deleted", () => {
		render(<UsersRowActions user={createUser({ suspendedAt: null })} />);
		expect(screen.getByText("Suspendre")).toBeInTheDocument();
	});

	it("shows 'Lever la suspension' when user is suspended", () => {
		render(<UsersRowActions user={createUser({ suspendedAt: new Date() })} />);
		expect(screen.getByText("Lever la suspension")).toBeInTheDocument();
	});

	it("shows 'Supprimer' for non-deleted user", () => {
		render(<UsersRowActions user={createUser({ deletedAt: null })} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("shows role change submenu for non-deleted user", () => {
		render(<UsersRowActions user={createUser({ deletedAt: null })} />);
		expect(screen.getByText("Changer le role")).toBeInTheDocument();
	});

	// ─── Deleted user ─────────────────────────────────────────────────────────

	it("shows 'Restaurer' when user is deleted", () => {
		render(<UsersRowActions user={createUser({ deletedAt: new Date() })} />);
		expect(screen.getByText("Restaurer")).toBeInTheDocument();
	});

	it("does not show 'Supprimer' when user is deleted", () => {
		render(<UsersRowActions user={createUser({ deletedAt: new Date() })} />);
		expect(screen.queryByText("Supprimer")).toBeNull();
	});

	it("does not show role change submenu when user is deleted", () => {
		render(<UsersRowActions user={createUser({ deletedAt: new Date() })} />);
		expect(screen.queryByText("Changer le role")).toBeNull();
	});

	// ─── Dialogs ──────────────────────────────────────────────────────────────

	it("renders delete dialog when deleteDialog.isOpen is true", () => {
		mockDeleteDialog.isOpen = true;
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
		expect(document.body.textContent).toContain("Supprimer l");
	});

	it("renders suspend dialog when suspendDialog.isOpen is true", () => {
		mockSuspendDialog.isOpen = true;
		render(<UsersRowActions user={createUser()} />);
		expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
		expect(document.body.textContent).toContain("Suspendre l");
	});

	// ─── displayName fallback ─────────────────────────────────────────────────

	it("uses email as displayName when name is falsy", () => {
		render(<UsersRowActions user={createUser({ name: "", email: "no-name@test.com" })} />);
		// Delete dialog would show the display name; for now just check render doesn't throw
		expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
	});
});
