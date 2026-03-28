import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockExportData, mockIsPending } = vi.hoisted(() => ({
	mockExportData: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/users/hooks/use-export-user-data", () => ({
	useExportUserData: vi.fn(() => ({
		exportData: mockExportData,
		isPending: mockIsPending.value,
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

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { ExportDataButton } from "../export-data-button";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
});

beforeEach(() => {
	mockIsPending.value = false;
});

describe("ExportDataButton", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the export button in idle state", () => {
		render(<ExportDataButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("shows 'Exporter mes données' label in idle state", () => {
		render(<ExportDataButton />);
		expect(screen.getByRole("button").textContent).toBe("Exporter mes données");
	});

	it("renders the description text about JSON format", () => {
		render(<ExportDataButton />);
		expect(document.body.textContent).toContain("JSON");
	});

	it("button is enabled when not pending", () => {
		render(<ExportDataButton />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows 'Export en cours...' when isPending is true", () => {
		mockIsPending.value = true;
		render(<ExportDataButton />);
		expect(screen.getByRole("button").textContent).toBe("Export en cours...");
	});

	it("disables button when isPending is true", () => {
		mockIsPending.value = true;
		render(<ExportDataButton />);
		expect(screen.getByRole("button")).toBeDisabled();
	});
});
