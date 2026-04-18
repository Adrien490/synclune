import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

const mockSearchParamsGet = vi.hoisted(() => vi.fn((_key: string): string | null => null));
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

type SheetMockProps = { open: boolean; onOpenChange: (open: boolean) => void };
const periodSheetProps: { current: SheetMockProps | null } = { current: null };
const refreshSheetProps: { current: SheetMockProps | null } = { current: null };

vi.mock("../dashboard-period-sheet", () => ({
	DashboardPeriodSheet: (props: SheetMockProps) => {
		periodSheetProps.current = props;
		return props.open ? <div data-testid="period-sheet" /> : null;
	},
}));

vi.mock("../dashboard-refresh-sheet", () => ({
	DashboardRefreshSheet: (props: SheetMockProps) => {
		refreshSheetProps.current = props;
		return props.open ? <div data-testid="refresh-sheet" /> : null;
	},
}));

vi.mock("lucide-react", () => ({
	CalendarRange: (props: { className?: string }) => (
		<span data-testid="icon-period" className={props.className} />
	),
	RefreshCw: (props: { className?: string }) => (
		<span data-testid="icon-refresh" className={props.className} />
	),
}));

import { DashboardMobileActionBar } from "../dashboard-mobile-action-bar";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSearchParamsGet.mockReturnValue(null);
	periodSheetProps.current = null;
	refreshSheetProps.current = null;
});

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardMobileActionBar", () => {
	beforeEach(() => {
		mockSearchParamsGet.mockReturnValue(null);
	});

	it("renders a toolbar nav region with 2 buttons", () => {
		render(<DashboardMobileActionBar />);

		const toolbar = screen.getByRole("toolbar", { name: /actions du tableau de bord/i });
		expect(toolbar).toBeInTheDocument();
		expect(toolbar.getAttribute("aria-orientation")).toBe("horizontal");

		expect(
			screen.getByRole("button", { name: /ouvrir le sélecteur de période/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /ouvrir la synchronisation/i })).toBeInTheDocument();
	});

	it("does NOT render a 'Tableau de bord' h1", () => {
		render(<DashboardMobileActionBar />);

		expect(screen.queryByRole("heading", { level: 1, name: /tableau de bord/i })).toBeNull();
	});

	it("marks buttons with aria-haspopup='dialog' for assistive tech", () => {
		render(<DashboardMobileActionBar />);

		expect(screen.getByRole("button", { name: /période/i })).toHaveAttribute(
			"aria-haspopup",
			"dialog",
		);
		expect(screen.getByRole("button", { name: /synchronisation/i })).toHaveAttribute(
			"aria-haspopup",
			"dialog",
		);
	});

	it("applies 44px touch target (h-11) to all buttons", () => {
		render(<DashboardMobileActionBar />);

		const buttons = screen.getAllByRole("button");
		for (const btn of buttons) {
			expect(btn.className).toMatch(/h-11/);
		}
	});

	it("shows active dot on Période button when period differs from default", () => {
		mockSearchParamsGet.mockImplementation((key: string) => (key === "period" ? "year" : null));
		render(<DashboardMobileActionBar />);

		expect(screen.getByRole("button", { name: /période active : année/i })).toBeInTheDocument();
	});

	it("shows active dot when comparison mode differs from default", () => {
		mockSearchParamsGet.mockImplementation((key: string) => (key === "comparison" ? "yoy" : null));
		render(<DashboardMobileActionBar />);

		expect(screen.getByRole("button", { name: /période active/i })).toBeInTheDocument();
	});

	it("does NOT show active state when both period and comparison are default", () => {
		render(<DashboardMobileActionBar />);

		expect(
			screen.getByRole("button", { name: /ouvrir le sélecteur de période/i }),
		).toBeInTheDocument();
	});

	it("opens the period sheet when Période is tapped + fires selection haptic", async () => {
		const user = userEvent.setup();
		render(<DashboardMobileActionBar />);

		await user.click(screen.getByRole("button", { name: /période/i }));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(await screen.findByTestId("period-sheet")).toBeInTheDocument();
	});

	it("opens the refresh sheet when Rafraîchir is tapped + fires selection haptic", async () => {
		const user = userEvent.setup();
		render(<DashboardMobileActionBar />);

		await user.click(screen.getByRole("button", { name: /synchronisation/i }));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(await screen.findByTestId("refresh-sheet")).toBeInTheDocument();
	});

	it("closes refresh sheet when opening period sheet (mutual exclusion)", async () => {
		const user = userEvent.setup();
		render(<DashboardMobileActionBar />);

		await user.click(screen.getByRole("button", { name: /synchronisation/i }));
		expect(await screen.findByTestId("refresh-sheet")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /période/i }));
		expect(await screen.findByTestId("period-sheet")).toBeInTheDocument();
		expect(screen.queryByTestId("refresh-sheet")).toBeNull();
	});

	it("navigates between buttons with ArrowRight / ArrowLeft", async () => {
		const user = userEvent.setup();
		render(<DashboardMobileActionBar />);

		const periodBtn = screen.getByRole("button", { name: /période/i });
		periodBtn.focus();

		await user.keyboard("{ArrowRight}");
		expect(screen.getByRole("button", { name: /synchronisation/i })).toHaveFocus();

		await user.keyboard("{ArrowRight}");
		// wraps around
		expect(screen.getByRole("button", { name: /période/i })).toHaveFocus();

		await user.keyboard("{ArrowLeft}");
		expect(screen.getByRole("button", { name: /synchronisation/i })).toHaveFocus();
	});

	it("jumps to first/last with Home/End", async () => {
		const user = userEvent.setup();
		render(<DashboardMobileActionBar />);

		const periodBtn = screen.getByRole("button", { name: /période/i });
		periodBtn.focus();

		await user.keyboard("{End}");
		expect(screen.getByRole("button", { name: /synchronisation/i })).toHaveFocus();

		await user.keyboard("{Home}");
		expect(screen.getByRole("button", { name: /période/i })).toHaveFocus();
	});

	it("exposes a sr-only live region for status announcements", () => {
		render(<DashboardMobileActionBar />);

		const announcers = screen.getAllByRole("status", { hidden: true });
		expect(announcers.length).toBeGreaterThan(0);
	});
});
