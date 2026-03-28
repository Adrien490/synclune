import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDialog, mockAction } = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockAction: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/modules/customizations/hooks/use-update-customization-status", () => ({
	useUpdateCustomizationStatus: () => ({ action: mockAction, isPending: false }),
}));

vi.mock("@/modules/customizations/components/admin/update-notes-dialog", () => ({
	UPDATE_NOTES_DIALOG_ID: "update-customization-notes",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} {...rest}>
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
	DropdownMenuLabel: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => <div className={className}>{children}</div>,
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		className?: string;
	}) => (
		<button role="menuitem" onClick={onClick} className={className}>
			{children}
		</button>
	),
	DropdownMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuSubTrigger: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => (
		<button role="menuitem" disabled={disabled}>
			{children}
		</button>
	),
	DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	Clock: () => <svg data-testid="icon-clock" />,
	Copy: () => <svg data-testid="icon-copy" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	Mail: () => <svg data-testid="icon-mail" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	StickyNote: () => <svg data-testid="icon-sticky-note" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
}));

import { CustomizationRowActions } from "../customization-row-actions";
import type { CustomizationRequestStatus } from "../../../types/customization.types";

// ============================================================================
// HELPERS
// ============================================================================

function createRequest(overrides: Record<string, unknown> = {}) {
	return {
		id: "req-1",
		firstName: "Marie",
		email: "marie@example.com",
		status: "PENDING" as CustomizationRequestStatus,
		adminNotes: null,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the trigger button with aria-label 'Actions'", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
	});

	it("shows client name in dropdown label", () => {
		render(<CustomizationRowActions request={createRequest({ firstName: "Marie" })} />);
		expect(screen.getByText("Marie")).toBeInTheDocument();
	});

	it("shows 'Changer le statut' sub-trigger", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(screen.getByText("Changer le statut")).toBeInTheDocument();
	});

	it("shows 'Notes internes' menu item", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(screen.getByText("Notes internes")).toBeInTheDocument();
	});

	it("shows 'Copier l\u2019email' menu item", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(screen.getByText("Copier l'email")).toBeInTheDocument();
	});

	it("shows 'Répondre par email' menu item", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(screen.getByText("Répondre par email")).toBeInTheDocument();
	});

	// ─── Status submenu ───────────────────────────────────────────────────────

	it("renders all 4 statuses in submenu", () => {
		render(<CustomizationRowActions request={createRequest({ status: "IN_PROGRESS" })} />);
		expect(screen.getByText("En attente")).toBeInTheDocument();
		expect(screen.getByText("En cours")).toBeInTheDocument();
		expect(screen.getByText("Terminé")).toBeInTheDocument();
		expect(screen.getByText("Annulé")).toBeInTheDocument();
	});

	it("marks the current status with 'actuel' label", () => {
		render(<CustomizationRowActions request={createRequest({ status: "PENDING" })} />);
		expect(screen.getByText("actuel")).toBeInTheDocument();
	});

	// ─── Admin notes indicator ────────────────────────────────────────────────

	it("shows note indicator dot when adminNotes is set", () => {
		const { container } = render(
			<CustomizationRowActions request={createRequest({ adminNotes: "Some note" })} />,
		);
		// The dot is a span with bg-primary class
		const dot = container.querySelector(".bg-primary.rounded-full");
		expect(dot).toBeInTheDocument();
	});

	it("does not show note indicator dot when adminNotes is null", () => {
		const { container } = render(
			<CustomizationRowActions request={createRequest({ adminNotes: null })} />,
		);
		const dot = container.querySelector(".bg-primary.rounded-full");
		expect(dot).not.toBeInTheDocument();
	});

	// ─── Separator ────────────────────────────────────────────────────────────

	it("renders separators in the menu", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(screen.getAllByTestId("dropdown-separator").length).toBeGreaterThanOrEqual(1);
	});
});
