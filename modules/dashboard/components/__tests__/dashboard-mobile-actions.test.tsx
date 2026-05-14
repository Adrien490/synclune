import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		"aria-label": ariaLabel,
		"aria-expanded": ariaExpanded,
		"aria-haspopup": ariaHaspopup,
		className,
		...props
	}: React.ComponentProps<"button"> & { "aria-haspopup"?: string }) => (
		<button
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-expanded={ariaExpanded}
			aria-haspopup={ariaHaspopup}
			className={className}
			{...props}
		>
			{children}
		</button>
	),
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	CalendarRange: () => <span data-testid="icon-calendar" />,
	ChevronDown: () => <span data-testid="icon-chevron" />,
	RefreshCw: () => <span data-testid="icon-refresh" />,
	Download: () => <span data-testid="icon-download" />,
	LoaderCircle: () => <span data-testid="icon-loader" />,
}));

const mockSearchParamsGet = vi.hoisted(() => vi.fn((_key: string): string | null => null));
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock("../dashboard-period-sheet", () => ({
	DashboardPeriodSheet: ({ open }: { open: boolean }) =>
		open ? <div data-testid="period-sheet-open" /> : null,
}));

vi.mock("../dashboard-refresh-sheet", () => ({
	DashboardRefreshSheet: ({ open }: { open: boolean }) =>
		open ? <div data-testid="refresh-sheet-open" /> : null,
}));

vi.mock("../export-revenue-button", () => ({
	ExportRevenueButton: ({ period, mode }: { period: string; mode?: string }) => (
		<button data-testid="export-button" data-period={period} data-mode={mode}>
			Export
		</button>
	),
}));

import { DashboardMobileActions } from "../dashboard-mobile-actions";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSearchParamsGet.mockReturnValue(null);
});

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardMobileActions", () => {
	beforeEach(() => {
		mockSearchParamsGet.mockReturnValue(null);
	});

	it("renders 3 triggers (period, refresh, export) inside a labelled group", () => {
		render(<DashboardMobileActions period="month" />);

		const group = screen.getByRole("group", { name: /actions du tableau de bord/i });
		expect(group).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /période/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /synchroniser les données/i })).toBeInTheDocument();
		expect(screen.getByTestId("export-button")).toBeInTheDocument();
	});

	it("shows the current period label fallback when no search param is set", () => {
		render(<DashboardMobileActions period="month" />);

		const periodButton = screen.getByRole("button", { name: /période/i });
		expect(periodButton).toHaveAttribute("aria-haspopup", "dialog");
		expect(periodButton.textContent).toMatch(/ce mois/i);
	});

	it("reflects the search-param period when present", () => {
		mockSearchParamsGet.mockReturnValue("7d");
		render(<DashboardMobileActions period="7d" />);

		const periodButton = screen.getByRole("button", { name: /période/i });
		expect(periodButton.textContent).toMatch(/7 jours/i);
	});

	it("opens the period sheet + fires 'selection' haptic on period trigger click", async () => {
		const user = userEvent.setup();
		render(<DashboardMobileActions period="month" />);

		expect(screen.queryByTestId("period-sheet-open")).toBeNull();
		await user.click(screen.getByRole("button", { name: /période/i }));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(screen.getByTestId("period-sheet-open")).toBeInTheDocument();
	});

	it("opens the refresh sheet + fires 'light' haptic on refresh trigger click", async () => {
		const user = userEvent.setup();
		render(<DashboardMobileActions period="month" />);

		expect(screen.queryByTestId("refresh-sheet-open")).toBeNull();
		await user.click(screen.getByRole("button", { name: /synchroniser les données/i }));

		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(screen.getByTestId("refresh-sheet-open")).toBeInTheDocument();
	});

	it("forwards period prop + 'icon' mode to ExportRevenueButton", () => {
		render(<DashboardMobileActions period="quarter" />);

		const exportBtn = screen.getByTestId("export-button");
		expect(exportBtn).toHaveAttribute("data-period", "quarter");
		expect(exportBtn).toHaveAttribute("data-mode", "icon");
	});
});
