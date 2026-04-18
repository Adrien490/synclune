import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefreshDashboard } = vi.hoisted(() => ({
	mockRefreshDashboard: vi.fn(),
}));

vi.mock("@/modules/dashboard/actions/refresh-dashboard", () => ({
	refreshDashboard: mockRefreshDashboard,
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
		info: vi.fn(),
		message: vi.fn(),
		promise: vi.fn(),
		custom: vi.fn(),
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useRefreshDashboard } from "../use-refresh-dashboard";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Tableau de bord rafraichi" };
const ERROR = { status: "error" as const, message: "Erreur" };

// ============================================================================
// TESTS
// ============================================================================

describe("useRefreshDashboard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshDashboard.mockResolvedValue(SUCCESS);
	});

	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	it("returns refresh function and isPending state", () => {
		const { result } = renderHook(() => useRefreshDashboard());

		expect(typeof result.current.refresh).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useRefreshDashboard());

		expect(result.current.isPending).toBe(false);
	});

	// -------------------------------------------------------------------------
	// Delegates to useRefreshAction with refreshDashboard
	// -------------------------------------------------------------------------

	it("calls the refreshDashboard action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshDashboard());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshDashboard).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// onSuccess callback
	// -------------------------------------------------------------------------

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshDashboard({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshDashboard.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshDashboard({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useRefreshDashboard());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshDashboard).toHaveBeenCalledTimes(1);
	});

	// -------------------------------------------------------------------------
	// lastRefreshedAt timestamp
	// -------------------------------------------------------------------------

	it("exposes lastRefreshedAt=null before any refresh", () => {
		const { result } = renderHook(() => useRefreshDashboard());

		expect(result.current.lastRefreshedAt).toBeNull();
	});

	it("sets lastRefreshedAt to a Date after a successful refresh", async () => {
		const { result } = renderHook(() => useRefreshDashboard());

		await act(async () => {
			result.current.refresh();
		});

		expect(result.current.lastRefreshedAt).toBeInstanceOf(Date);
	});

	it("does NOT set lastRefreshedAt when the action fails", async () => {
		mockRefreshDashboard.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useRefreshDashboard());

		await act(async () => {
			result.current.refresh();
		});

		expect(result.current.lastRefreshedAt).toBeNull();
	});
});
