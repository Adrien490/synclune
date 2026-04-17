import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockExportReport = vi.fn();
const mockUseExportDashboard = vi.hoisted(() =>
	vi.fn(() => ({ exportReport: mockExportReport, isPending: false })),
);
const mockParsePeriod = vi.hoisted(() => vi.fn((value: string) => value));
const mockSearchParamsGet = vi.fn();

vi.mock("@/modules/dashboard/hooks/use-export-dashboard", () => ({
	useExportDashboard: mockUseExportDashboard,
}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock("@/modules/dashboard/constants/period.constants", () => ({
	DEFAULT_PERIOD: "month",
	PERIOD_SEARCH_PARAM: "period",
	parsePeriod: mockParsePeriod,
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

// Force desktop rendering path — tests cover the DropdownMenu branch.
// A separate describe block re-mocks useIsMobile to true to cover the Drawer branch.
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

import { ExportDashboardButton } from "../export-dashboard-button";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSearchParamsGet.mockReturnValue(null);
	mockUseExportDashboard.mockReturnValue({ exportReport: mockExportReport, isPending: false });
});

// ============================================================================
// TESTS
// ============================================================================

describe("ExportDashboardButton", () => {
	// -------------------------------------------------------------------------
	// Rendering
	// -------------------------------------------------------------------------

	it("renders the trigger button with aria-label", () => {
		render(<ExportDashboardButton />);
		expect(
			screen.getByRole("button", { name: /exporter le rapport du tableau de bord/i }),
		).toBeInTheDocument();
	});

	it("applies touchTarget styles (44px WCAG 2.5.5)", () => {
		render(<ExportDashboardButton />);
		const button = screen.getByRole("button", { name: /exporter/i });
		expect(button.className).toMatch(/h-11/);
	});

	it("renders in icon-only mode when iconOnly=true", () => {
		render(<ExportDashboardButton iconOnly />);
		const button = screen.getByRole("button", { name: /exporter/i });
		// No visible label but sr-only remains
		expect(button.querySelector(".sr-only")).toHaveTextContent("Exporter");
	});

	// -------------------------------------------------------------------------
	// Pending state
	// -------------------------------------------------------------------------

	it("shows spinner and disables when isPending=true", () => {
		mockUseExportDashboard.mockReturnValue({
			exportReport: mockExportReport,
			isPending: true,
		});
		render(<ExportDashboardButton />);
		const button = screen.getByRole("button", { name: /exporter/i });
		expect(button).toBeDisabled();
		expect(button.querySelector(".animate-spin")).not.toBeNull();
	});

	// -------------------------------------------------------------------------
	// Period resolution
	// -------------------------------------------------------------------------

	it("uses DEFAULT_PERIOD when no search param set", async () => {
		mockSearchParamsGet.mockReturnValue(null);
		const user = userEvent.setup();
		render(<ExportDashboardButton />);

		await user.click(screen.getByRole("button", { name: /exporter/i }));
		await user.click(await screen.findByText(/csv/i));

		expect(mockExportReport).toHaveBeenCalledWith({ period: "month", format: "csv" });
	});

	it("uses search param period when set", async () => {
		mockSearchParamsGet.mockReturnValue("year");
		const user = userEvent.setup();
		render(<ExportDashboardButton />);

		await user.click(screen.getByRole("button", { name: /exporter/i }));
		await user.click(await screen.findByText(/json/i));

		expect(mockExportReport).toHaveBeenCalledWith({ period: "year", format: "json" });
	});

	// -------------------------------------------------------------------------
	// Format selection
	// -------------------------------------------------------------------------

	it("triggers export with format=csv when CSV item selected", async () => {
		const user = userEvent.setup();
		render(<ExportDashboardButton />);

		await user.click(screen.getByRole("button", { name: /exporter/i }));
		await user.click(await screen.findByText(/csv/i));

		expect(mockExportReport).toHaveBeenCalledTimes(1);
		expect(mockExportReport).toHaveBeenCalledWith(expect.objectContaining({ format: "csv" }));
	});

	it("triggers export with format=json when JSON item selected", async () => {
		const user = userEvent.setup();
		render(<ExportDashboardButton />);

		await user.click(screen.getByRole("button", { name: /exporter/i }));
		await user.click(await screen.findByText(/json/i));

		expect(mockExportReport).toHaveBeenCalledWith(expect.objectContaining({ format: "json" }));
	});

	// -------------------------------------------------------------------------
	// Hook integration
	// -------------------------------------------------------------------------

	it("calls useExportDashboard hook", () => {
		render(<ExportDashboardButton />);
		expect(mockUseExportDashboard).toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	// Haptic feedback
	// -------------------------------------------------------------------------

	it("fires a 'medium' haptic when the trigger is tapped", async () => {
		const user = userEvent.setup();
		render(<ExportDashboardButton />);

		await user.click(screen.getByRole("button", { name: /exporter/i }));

		expect(mockHaptic).toHaveBeenCalledWith("medium");
	});

	it("fires a 'selection' haptic when a format is chosen", async () => {
		const user = userEvent.setup();
		render(<ExportDashboardButton />);

		await user.click(screen.getByRole("button", { name: /exporter/i }));
		await user.click(await screen.findByText(/csv/i));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("wires onSuccess to a 'success' haptic", () => {
		render(<ExportDashboardButton />);

		const lastCall = mockUseExportDashboard.mock.calls.at(-1) as
			| [options?: { onSuccess?: () => void }]
			| undefined;
		const onSuccess = lastCall?.[0]?.onSuccess;
		expect(typeof onSuccess).toBe("function");
		onSuccess?.();
		expect(mockHaptic).toHaveBeenCalledWith("success");
	});
});
