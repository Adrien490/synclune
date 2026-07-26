import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const mockRefresh = vi.fn();
const mockUseRefreshDashboard = vi.hoisted(() =>
	vi.fn(() => ({ refresh: mockRefresh, isPending: false })),
);

vi.mock("@/modules/dashboard/hooks/use-refresh-dashboard", () => ({
	useRefreshDashboard: mockUseRefreshDashboard,
}));

const mockHaptic = vi.hoisted(() => vi.fn());
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockHaptic,
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		onRefresh,
		isPending,
		label,
		className,
		variant,
	}: {
		onRefresh: () => void;
		isPending: boolean;
		label?: string;
		className?: string;
		variant?: string;
	}) => (
		<button
			data-testid="refresh-button"
			data-pending={isPending}
			data-variant={variant}
			className={className}
			onClick={onRefresh}
			aria-label={label}
			disabled={isPending}
		>
			{label}
		</button>
	),
}));

import { RefreshDashboardButton } from "../refresh-dashboard-button";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("RefreshDashboardButton", () => {
	// -------------------------------------------------------------------------
	// Rendering
	// -------------------------------------------------------------------------

	it("renders the refresh button", () => {
		render(<RefreshDashboardButton />);

		expect(screen.getByTestId("refresh-button")).toBeInTheDocument();
	});

	it("renders with label 'Rafraîchir le tableau de bord'", () => {
		render(<RefreshDashboardButton />);

		expect(screen.getByText("Rafraîchir le tableau de bord")).toBeInTheDocument();
	});

	it("renders with default outline variant", () => {
		render(<RefreshDashboardButton />);

		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "outline");
	});

	it("renders with custom variant when provided", () => {
		render(<RefreshDashboardButton variant="ghost" />);

		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-variant", "ghost");
	});

	it("passes className to refresh button", () => {
		render(<RefreshDashboardButton className="my-custom-class" />);

		expect(screen.getByTestId("refresh-button")).toHaveClass("my-custom-class");
	});

	// -------------------------------------------------------------------------
	// Hook integration
	// -------------------------------------------------------------------------

	it("calls useRefreshDashboard hook", () => {
		render(<RefreshDashboardButton />);

		expect(mockUseRefreshDashboard).toHaveBeenCalled();
	});

	it("passes refresh function from hook to button", () => {
		render(<RefreshDashboardButton />);

		screen.getByTestId("refresh-button").click();

		expect(mockRefresh).toHaveBeenCalledOnce();
	});

	// -------------------------------------------------------------------------
	// Loading state
	// -------------------------------------------------------------------------

	it("is not disabled when isPending is false", () => {
		mockUseRefreshDashboard.mockReturnValue({ refresh: mockRefresh, isPending: false });

		render(<RefreshDashboardButton />);

		expect(screen.getByTestId("refresh-button")).not.toBeDisabled();
	});

	it("is disabled when isPending is true", () => {
		mockUseRefreshDashboard.mockReturnValue({ refresh: mockRefresh, isPending: true });

		render(<RefreshDashboardButton />);

		expect(screen.getByTestId("refresh-button")).toBeDisabled();
	});

	it("passes isPending=true to RefreshButton when hook returns pending state", () => {
		mockUseRefreshDashboard.mockReturnValue({ refresh: mockRefresh, isPending: true });

		render(<RefreshDashboardButton />);

		expect(screen.getByTestId("refresh-button")).toHaveAttribute("data-pending", "true");
	});

	// -------------------------------------------------------------------------
	// Haptic feedback
	// -------------------------------------------------------------------------

	/**
	 * @regression single-haptic-per-intent
	 * Le `light` au clic et le `success` à l'arrivée des données sont séparés par
	 * un aller-retour serveur, donc hors du cooldown de 80 ms : c'étaient deux
	 * vibrations réelles pour un seul appui. Seule celle qui porte l'information
	 * (« données à jour ») est conservée.
	 */
	it("fires no haptic on tap — only on refresh completion", () => {
		mockUseRefreshDashboard.mockReturnValue({ refresh: mockRefresh, isPending: false });

		render(<RefreshDashboardButton />);
		screen.getByTestId("refresh-button").click();

		expect(mockRefresh).toHaveBeenCalled();
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("wires onSuccess to a 'success' haptic", () => {
		render(<RefreshDashboardButton />);

		const lastCall = mockUseRefreshDashboard.mock.calls.at(-1) as
			[options?: { onSuccess?: () => void }] | undefined;
		const onSuccess = lastCall?.[0]?.onSuccess;
		expect(typeof onSuccess).toBe("function");
		onSuccess?.();
		expect(mockHaptic).toHaveBeenCalledWith("success");
	});
});
