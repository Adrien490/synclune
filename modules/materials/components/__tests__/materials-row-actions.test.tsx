import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockOpenDialog,
	mockOpenAlertDialog,
	mockDuplicate,
	mockToggleStatus,
	mockPush,
	mockIsMobile,
} = vi.hoisted(() => ({
	mockOpenDialog: vi.fn(),
	mockOpenAlertDialog: vi.fn(),
	mockDuplicate: vi.fn(),
	mockToggleStatus: vi.fn(),
	mockPush: vi.fn(),
	mockIsMobile: { current: false },
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDialog }),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.current,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: mockOpenAlertDialog }),
}));

vi.mock("@/modules/materials/hooks/use-duplicate-material", () => ({
	useDuplicateMaterial: () => ({ duplicate: mockDuplicate, isPending: false }),
}));

vi.mock("@/modules/materials/hooks/use-toggle-material-status", () => ({
	useToggleMaterialStatus: () => ({ toggleStatus: mockToggleStatus, isPending: false }),
}));

vi.mock("@/modules/materials/components/material-form-dialog", () => ({
	MATERIAL_DIALOG_ID: "material-form",
}));

vi.mock("@/modules/materials/components/admin/delete-material-alert-dialog", () => ({
	DELETE_MATERIAL_DIALOG_ID: "delete-material",
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		className,
		...rest
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button aria-label={ariaLabel} className={className} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/responsive-action-menu", async () => {
	const { buildResponsiveActionMenuMock } =
		await import("@/shared/components/responsive-action-menu/test-mock");
	return buildResponsiveActionMenuMock();
});

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	Copy: () => <svg data-testid="icon-copy" />,
	SquarePen: () => <svg data-testid="icon-square-pen" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	Power: () => <svg data-testid="icon-power" />,
	PowerOff: () => <svg data-testid="icon-power-off" />,
	Trash2: () => <svg data-testid="icon-trash" />,
}));

import { MaterialsRowActions } from "../materials-row-actions";

// ============================================================================
// HELPERS
// ============================================================================

interface MaterialsRowActionsProps {
	materialId: string;
	materialName: string;
	materialSlug: string;
	materialDescription: string | null;
	materialIsActive: boolean;
}

function createProps(overrides: Partial<MaterialsRowActionsProps> = {}): MaterialsRowActionsProps {
	return {
		materialId: "mat-1",
		materialName: "Argent 925",
		materialSlug: "argent-925",
		materialDescription: "Argent sterling de qualité",
		materialIsActive: true,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MaterialsRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsMobile.current = false;
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders trigger button with contextual aria-label including the material name", () => {
		render(<MaterialsRowActions {...createProps({ materialName: "Argent 925" })} />);
		expect(screen.getByRole("button", { name: "Actions pour Argent 925" })).toBeInTheDocument();
	});

	it("renders trigger button with aria-label reflecting a different material name", () => {
		render(<MaterialsRowActions {...createProps({ materialName: "Or 18 carats" })} />);
		expect(screen.getByRole("button", { name: "Actions pour Or 18 carats" })).toBeInTheDocument();
	});

	it("shows 'Éditer' menu item", () => {
		render(<MaterialsRowActions {...createProps()} />);
		expect(screen.getByText("Éditer")).toBeInTheDocument();
	});

	it("shows 'Dupliquer' menu item", () => {
		render(<MaterialsRowActions {...createProps()} />);
		expect(screen.getByText("Dupliquer")).toBeInTheDocument();
	});

	it("shows 'Voir les variantes' menu item", () => {
		render(<MaterialsRowActions {...createProps()} />);
		expect(screen.getByText("Voir les variantes")).toBeInTheDocument();
	});

	// ─── Toggle item ──────────────────────────────────────────────────────────

	it("shows 'Désactiver' when material is active", () => {
		render(<MaterialsRowActions {...createProps({ materialIsActive: true })} />);
		expect(screen.getByText("Désactiver")).toBeInTheDocument();
	});

	it("shows 'Activer' when material is inactive", () => {
		render(<MaterialsRowActions {...createProps({ materialIsActive: false })} />);
		expect(screen.getByText("Activer")).toBeInTheDocument();
	});

	// ─── Delete item ──────────────────────────────────────────────────────────

	it("renders 'Supprimer' menu item", () => {
		render(<MaterialsRowActions {...createProps()} />);
		expect(screen.getByText("Supprimer")).toBeInTheDocument();
	});

	it("marks 'Supprimer' as destructive variant", () => {
		render(<MaterialsRowActions {...createProps()} />);
		const deleteItem = screen.getByRole("menuitem", { name: "Supprimer" });
		expect(deleteItem).toHaveAttribute("data-variant", "destructive");
	});

	// ─── Link ─────────────────────────────────────────────────────────────────

	it("links 'Voir les variantes' to inventory filtered by materialId", () => {
		render(<MaterialsRowActions {...createProps({ materialId: "mat-42" })} />);
		const link = screen.getByRole("menuitem", { name: "Voir les variantes" });
		expect(link).toHaveAttribute("href", "/admin/catalogue/inventaire?materialId=mat-42");
	});
});
