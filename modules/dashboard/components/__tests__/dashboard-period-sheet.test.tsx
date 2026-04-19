import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
		open !== false ? <div data-testid="sheet">{children}</div> : null,
	SheetTrigger: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sheet-trigger">{children}</div>
	),
	SheetContent: ({ children, ...props }: React.ComponentProps<"div">) => (
		<div data-testid="sheet-content" {...props}>
			{children}
		</div>
	),
	SheetHeader: ({ children, ...props }: React.ComponentProps<"div">) => (
		<div data-testid="sheet-header" {...props}>
			{children}
		</div>
	),
	SheetFooter: ({ children, ...props }: React.ComponentProps<"div">) => (
		<div data-testid="sheet-footer" {...props}>
			{children}
		</div>
	),
	SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	SheetTitle: ({ children, ...props }: React.ComponentProps<"h2">) => (
		<h2 {...props}>{children}</h2>
	),
	SheetHandle: () => <span data-testid="sheet-handle" />,
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => true,
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		...props
	}: React.ComponentProps<"button">) => (
		<button onClick={onClick} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	X: () => <span data-testid="x-icon" />,
}));

const mockSearchParamsGet = vi.hoisted(() => vi.fn((_key: string): string | null => null));
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

vi.mock("../period-selector", () => ({
	PeriodSelector: ({ variant }: { variant?: string }) => (
		<div data-testid="period-selector" data-variant={variant} />
	),
}));

import { DashboardPeriodSheet } from "../dashboard-period-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSearchParamsGet.mockReturnValue(null);
});

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardPeriodSheet", () => {
	beforeEach(() => {
		mockSearchParamsGet.mockReturnValue(null);
	});

	it("does NOT render when open=false", () => {
		render(<DashboardPeriodSheet open={false} onOpenChange={() => {}} />);
		expect(screen.queryByTestId("sheet")).toBeNull();
	});

	it("renders header title 'Période' and description when open=true", () => {
		render(<DashboardPeriodSheet open onOpenChange={() => {}} />);

		expect(screen.getByRole("heading", { name: /^période$/i, level: 2 })).toBeInTheDocument();
		expect(screen.getByText(/choisissez la période d'analyse/i)).toBeInTheDocument();
	});

	it("renders PeriodSelector in segmented variant", () => {
		render(<DashboardPeriodSheet open onOpenChange={() => {}} />);
		const periodSelector = screen.getByTestId("period-selector");
		expect(periodSelector).toHaveAttribute("data-variant", "segmented");
	});

	it("renders a close button in header and a footer close button", () => {
		render(<DashboardPeriodSheet open onOpenChange={() => {}} />);

		// header (aria-label="Fermer") + footer (text "Fermer")
		const closeButtons = screen.getAllByRole("button", { name: /^fermer$/i });
		expect(closeButtons.length).toBeGreaterThanOrEqual(2);
	});

	it("renders sheet handle on mobile", () => {
		render(<DashboardPeriodSheet open onOpenChange={() => {}} />);
		expect(screen.getByTestId("sheet-handle")).toBeInTheDocument();
	});

	it("fires 'selection' haptic when the footer close button is clicked", async () => {
		const user = userEvent.setup();
		render(<DashboardPeriodSheet open onOpenChange={() => {}} />);

		const closeButtons = screen.getAllByRole("button", { name: /fermer/i });
		// Click the footer close (index 1 — header close is at index 0 or vice versa; the key is it fires haptic)
		await user.click(closeButtons[closeButtons.length - 1]!);

		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});
});
