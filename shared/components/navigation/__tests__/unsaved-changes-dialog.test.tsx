import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockNavigationGuard } = vi.hoisted(() => ({
	mockNavigationGuard: {
		pendingNavigation: null as { destination: string; proceed: () => void } | null,
		guardMessage:
			"Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?",
		confirmNavigation: vi.fn(),
		cancelNavigation: vi.fn(),
		registerGuard: vi.fn(),
		unregisterGuard: vi.fn(),
		requestNavigation: vi.fn(() => true),
		hasActiveGuards: vi.fn(() => false),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/contexts/navigation-guard-context", () => ({
	useNavigationGuard: () => mockNavigationGuard,
}));

vi.mock("@/shared/components/ui/alert-dialog", () => {
	const { createElement } = require("react");
	return {
		AlertDialog: ({
			children,
			open,
			onOpenChange,
		}: {
			children: unknown;
			open?: boolean;
			onOpenChange?: (v: boolean) => void;
		}) =>
			createElement(
				"div",
				{
					"data-testid": "alert-dialog",
					"data-open": String(open),
					onClick: (e: MouseEvent) => {
						if ((e.target as HTMLElement).getAttribute("data-testid") === "alert-dialog") {
							onOpenChange?.(false);
						}
					},
				},
				open ? children : null,
			),
		AlertDialogContent: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-content" }, children),
		AlertDialogHeader: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-header" }, children),
		AlertDialogFooter: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-footer" }, children),
		AlertDialogTitle: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-title" }, children),
		AlertDialogDescription: ({ children }: { children?: unknown }) =>
			createElement("div", { "data-testid": "alert-dialog-description" }, children),
		AlertDialogCancel: ({ children, onClick }: { children?: unknown; onClick?: () => void }) =>
			createElement("button", { "data-testid": "alert-dialog-cancel", onClick }, children),
		AlertDialogAction: ({ children, onClick }: { children?: unknown; onClick?: () => void }) =>
			createElement("button", { "data-testid": "alert-dialog-action", onClick }, children),
	};
});

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { UnsavedChangesDialog } from "../unsaved-changes-dialog";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockNavigationGuard.pendingNavigation = null;
	mockNavigationGuard.guardMessage =
		"Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?";
	mockNavigationGuard.confirmNavigation = vi.fn();
	mockNavigationGuard.cancelNavigation = vi.fn();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("UnsavedChangesDialog", () => {
	// ============================================================================
	// OPEN STATE
	// ============================================================================

	describe("open state", () => {
		it("dialog is closed when pendingNavigation is null", () => {
			mockNavigationGuard.pendingNavigation = null;
			render(<UnsavedChangesDialog />);

			expect(screen.getByTestId("alert-dialog")).toHaveAttribute("data-open", "false");
		});

		it("dialog is open when pendingNavigation is set", () => {
			mockNavigationGuard.pendingNavigation = {
				destination: "/products",
				proceed: vi.fn(),
			};
			render(<UnsavedChangesDialog />);

			expect(screen.getByTestId("alert-dialog")).toHaveAttribute("data-open", "true");
		});
	});

	// ============================================================================
	// CONTENT
	// ============================================================================

	describe("content", () => {
		beforeEach(() => {
			mockNavigationGuard.pendingNavigation = {
				destination: "/products",
				proceed: vi.fn(),
			};
		});

		it("displays the title 'Modifications non enregistrées'", () => {
			render(<UnsavedChangesDialog />);

			expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
				"Modifications non enregistrées",
			);
		});

		it("displays guardMessage as description", () => {
			mockNavigationGuard.guardMessage = "Des modifications seront perdues si vous quittez.";
			render(<UnsavedChangesDialog />);

			expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
				"Des modifications seront perdues si vous quittez.",
			);
		});

		it("renders 'Rester sur la page' cancel button", () => {
			render(<UnsavedChangesDialog />);

			expect(screen.getByTestId("alert-dialog-cancel")).toHaveTextContent("Rester sur la page");
		});

		it("renders 'Quitter sans sauvegarder' action button", () => {
			render(<UnsavedChangesDialog />);

			expect(screen.getByTestId("alert-dialog-action")).toHaveTextContent(
				"Quitter sans sauvegarder",
			);
		});
	});

	// ============================================================================
	// INTERACTIONS
	// ============================================================================

	describe("interactions", () => {
		beforeEach(() => {
			mockNavigationGuard.pendingNavigation = {
				destination: "/products",
				proceed: vi.fn(),
			};
		});

		it("clicking 'Rester sur la page' calls cancelNavigation", () => {
			render(<UnsavedChangesDialog />);

			fireEvent.click(screen.getByTestId("alert-dialog-cancel"));

			expect(mockNavigationGuard.cancelNavigation).toHaveBeenCalledTimes(1);
		});

		it("clicking 'Quitter sans sauvegarder' calls confirmNavigation", () => {
			render(<UnsavedChangesDialog />);

			fireEvent.click(screen.getByTestId("alert-dialog-action"));

			expect(mockNavigationGuard.confirmNavigation).toHaveBeenCalledTimes(1);
		});

		it("onOpenChange(false) calls cancelNavigation", () => {
			render(<UnsavedChangesDialog />);

			// The mock AlertDialog fires onOpenChange(false) on click
			fireEvent.click(screen.getByTestId("alert-dialog"));

			expect(mockNavigationGuard.cancelNavigation).toHaveBeenCalledTimes(1);
		});
	});
});
