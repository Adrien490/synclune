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
		disabled,
		"aria-label": ariaLabel,
		...props
	}: React.ComponentProps<"button">) => (
		<button onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Loader2: (props: { className?: string }) => (
		<span data-testid="icon-loader" className={props.className} />
	),
	RefreshCw: (props: { className?: string }) => (
		<span data-testid="icon-refresh" className={props.className} />
	),
	X: () => <span data-testid="icon-x" />,
}));

const mockRefresh = vi.hoisted(() => vi.fn());
const mockUseRefreshDashboard = vi.hoisted(() =>
	vi.fn((_options?: { onSuccess?: () => void }) => ({
		refresh: mockRefresh,
		isPending: false,
		lastRefreshedAt: null as Date | null,
	})),
);
vi.mock("@/modules/dashboard/hooks/use-refresh-dashboard", () => ({
	useRefreshDashboard: mockUseRefreshDashboard,
}));

import { DashboardRefreshSheet } from "../dashboard-refresh-sheet";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockUseRefreshDashboard.mockReturnValue({
		refresh: mockRefresh,
		isPending: false,
		lastRefreshedAt: null,
	});
});

// ============================================================================
// TESTS
// ============================================================================

describe("DashboardRefreshSheet", () => {
	beforeEach(() => {
		mockUseRefreshDashboard.mockReturnValue({
			refresh: mockRefresh,
			isPending: false,
			lastRefreshedAt: null,
		});
	});

	it("does NOT render when open=false", () => {
		render(<DashboardRefreshSheet open={false} onOpenChange={() => {}} />);
		expect(screen.queryByTestId("sheet")).toBeNull();
	});

	it("renders title and description when open=true", () => {
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);
		expect(
			screen.getByRole("heading", { level: 2, name: /synchroniser les données/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/met à jour les kpis/i)).toBeInTheDocument();
	});

	it("shows 'Jamais dans cette session' when lastRefreshedAt is null", () => {
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);
		expect(screen.getByTestId("dashboard-refresh-last-sync")).toHaveTextContent(
			/jamais dans cette session/i,
		);
	});

	it("shows relative time when lastRefreshedAt is provided", () => {
		mockUseRefreshDashboard.mockReturnValue({
			refresh: mockRefresh,
			isPending: false,
			lastRefreshedAt: new Date(Date.now() - 30_000),
		});
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);
		// Intl.RelativeTimeFormat FR returns something like "il y a 30 s"
		expect(screen.getByTestId("dashboard-refresh-last-sync")).toHaveTextContent(/il y a/i);
	});

	it("calls refresh + fires 'medium' haptic when primary button is clicked", async () => {
		const user = userEvent.setup();
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);

		await user.click(screen.getByRole("button", { name: /rafraîchir maintenant/i }));

		expect(mockHaptic).toHaveBeenCalledWith("medium");
		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});

	it("disables primary button when isPending=true", () => {
		mockUseRefreshDashboard.mockReturnValue({
			refresh: mockRefresh,
			isPending: true,
			lastRefreshedAt: null,
		});
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);

		expect(screen.getByRole("button", { name: /synchronisation/i })).toBeDisabled();
	});

	it("shows spinner when isPending=true", () => {
		mockUseRefreshDashboard.mockReturnValue({
			refresh: mockRefresh,
			isPending: true,
			lastRefreshedAt: null,
		});
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);

		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
	});

	it("wires onSuccess to 'success' haptic + closes the sheet", () => {
		const onOpenChange = vi.fn();
		render(<DashboardRefreshSheet open onOpenChange={onOpenChange} />);

		const lastCall = mockUseRefreshDashboard.mock.calls.at(-1) as
			| [options?: { onSuccess?: () => void }]
			| undefined;
		const onSuccess = lastCall?.[0]?.onSuccess;
		expect(typeof onSuccess).toBe("function");
		onSuccess?.();

		expect(mockHaptic).toHaveBeenCalledWith("success");
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("renders a cancel button", () => {
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);
		expect(screen.getByRole("button", { name: /annuler/i })).toBeInTheDocument();
	});

	it("renders sheet handle on mobile", () => {
		render(<DashboardRefreshSheet open onOpenChange={() => {}} />);
		expect(screen.getByTestId("sheet-handle")).toBeInTheDocument();
	});
});
