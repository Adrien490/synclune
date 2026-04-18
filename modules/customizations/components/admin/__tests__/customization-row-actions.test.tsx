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

vi.mock("@/modules/customizations/hooks/use-delete-customization-request", () => ({
	useDeleteCustomizationRequest: () => ({ action: vi.fn(), isPending: false }),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/modules/customizations/hooks/use-update-customization-status", () => ({
	useUpdateCustomizationStatus: () => ({ action: mockAction, isPending: false }),
}));

vi.mock("@/modules/customizations/components/admin/update-notes-dialog", () => ({
	UPDATE_NOTES_DIALOG_ID: "update-customization-notes",
}));

vi.mock("../../../constants/status.constants", () => ({
	CUSTOMIZATION_STATUS_LABELS: {
		PENDING: "En attente",
		IN_PROGRESS: "En cours",
		COMPLETED: "Terminé",
		CANCELLED: "Annulé",
	},
	CUSTOMIZATION_STATUS_COLORS: {
		PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", symbol: "⏳" },
		IN_PROGRESS: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", symbol: "⚙" },
		COMPLETED: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", symbol: "✓" },
		CANCELLED: { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-500", symbol: "✗" },
	},
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

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("lucide-react", () => ({
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	Clock: () => <svg data-testid="icon-clock" />,
	Copy: () => <svg data-testid="icon-copy" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	Mail: () => <svg data-testid="icon-mail" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	StickyNote: () => <svg data-testid="icon-sticky-note" />,
	CircleX: () => <svg data-testid="icon-circle-x" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="delete-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		[key: string]: unknown;
	}) => <button {...props}>{children}</button>,
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

	it("uses the client name as menu description", () => {
		render(<CustomizationRowActions request={createRequest({ firstName: "Marie" })} />);
		expect(screen.getByRole("menu", { name: "Actions demande" })).toBeInTheDocument();
	});

	it("renders a 'Statut' section", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(screen.getByTestId("section-status")).toHaveTextContent("Statut");
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

	it("marks the current status item as disabled", () => {
		render(<CustomizationRowActions request={createRequest({ status: "PENDING" })} />);
		const pendingItem = screen.getByRole("menuitem", { name: "En attente" });
		expect(pendingItem).toHaveAttribute("aria-disabled", "true");
	});

	it("groups actions into distinct sections", () => {
		render(<CustomizationRowActions request={createRequest()} />);
		expect(document.querySelectorAll("[data-section]").length).toBeGreaterThanOrEqual(3);
	});
});
