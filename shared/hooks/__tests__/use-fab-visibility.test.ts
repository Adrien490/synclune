import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockSetFabVisibility, mockToastError } = vi.hoisted(() => ({
	mockSetFabVisibility: vi.fn(() => new Promise<never>(() => {})),
	mockToastError: vi.fn(),
}));

// Mock the server action — returns a pending promise so isPending stays true
// during the async round-trip and does not interfere with initial-state tests.
vi.mock("@/shared/actions/set-fab-visibility", () => ({
	setFabVisibility: mockSetFabVisibility,
}));

// Mock withCallbacks as a transparent passthrough so the hook wires the real
// server action (already mocked above) without any callback decoration.
vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (fn: unknown) => fn,
}));

// Mock sonner to capture toast calls without rendering a toast UI.
vi.mock("sonner", () => ({
	toast: {
		error: mockToastError,
	},
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { useFabVisibility } from "../use-fab-visibility";
import { ActionStatus } from "@/shared/types/server-action";
import { FAB_KEYS } from "@/shared/constants/fab";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useFabVisibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset to a fresh pending promise for each test so action calls do not
		// accidentally settle from a previous test.
		mockSetFabVisibility.mockReturnValue(new Promise<never>(() => {}));
	});

	// -------------------------------------------------------------------------
	// Return value shape
	// -------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns all expected properties", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current).toHaveProperty("state");
			expect(result.current).toHaveProperty("isHidden");
			expect(result.current).toHaveProperty("toggle");
			expect(result.current).toHaveProperty("isPending");
			expect(result.current).toHaveProperty("isSuccess");
			expect(result.current).toHaveProperty("isError");
		});

		it("exposes toggle as a function", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(typeof result.current.toggle).toBe("function");
		});
	});

	// -------------------------------------------------------------------------
	// Initial state
	// -------------------------------------------------------------------------

	describe("initial state", () => {
		it("isHidden defaults to false when initialHidden is not provided", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current.isHidden).toBe(false);
		});

		it("isHidden reflects initialHidden=false explicitly", () => {
			const { result } = renderHook(() =>
				useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL, initialHidden: false }),
			);

			expect(result.current.isHidden).toBe(false);
		});

		it("isHidden reflects initialHidden=true", () => {
			const { result } = renderHook(() =>
				useFabVisibility({ key: FAB_KEYS.STOREFRONT, initialHidden: true }),
			);

			expect(result.current.isHidden).toBe(true);
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current.isPending).toBe(false);
		});

		it("isSuccess is false initially", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current.isSuccess).toBe(false);
		});

		it("isError is false initially", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current.isError).toBe(false);
		});

		it("state is undefined initially", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current.state).toBeUndefined();
		});

		it("isSuccess is false when state is undefined", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			// state is undefined, so state?.status === ActionStatus.SUCCESS is false
			expect(result.current.state?.status).not.toBe(ActionStatus.SUCCESS);
			expect(result.current.isSuccess).toBe(false);
		});

		it("isError is false when state is undefined", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current.state?.status).not.toBe(ActionStatus.ERROR);
			expect(result.current.isError).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// toggle — onToggle callback
	// -------------------------------------------------------------------------

	describe("toggle", () => {
		it("calls onToggle with the inverted hidden state (false → true)", () => {
			const onToggle = vi.fn();

			const { result } = renderHook(() =>
				useFabVisibility({
					key: FAB_KEYS.ADMIN_SPEED_DIAL,
					initialHidden: false,
					onToggle,
				}),
			);

			act(() => {
				result.current.toggle();
			});

			expect(onToggle).toHaveBeenCalledTimes(1);
			expect(onToggle).toHaveBeenCalledWith(true);
		});

		it("calls onToggle with the inverted hidden state (true → false)", () => {
			const onToggle = vi.fn();

			const { result } = renderHook(() =>
				useFabVisibility({
					key: FAB_KEYS.STOREFRONT,
					initialHidden: true,
					onToggle,
				}),
			);

			act(() => {
				result.current.toggle();
			});

			expect(onToggle).toHaveBeenCalledTimes(1);
			expect(onToggle).toHaveBeenCalledWith(false);
		});

		it("does not throw when onToggle is not provided", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(() => {
				act(() => {
					result.current.toggle();
				});
			}).not.toThrow();
		});

		it("calls onToggle before the server action (immediate invocation)", () => {
			const callOrder: string[] = [];
			const onToggle = vi.fn(() => {
				callOrder.push("onToggle");
			});

			mockSetFabVisibility.mockImplementation(() => {
				callOrder.push("setFabVisibility");
				return new Promise<never>(() => {});
			});

			const { result } = renderHook(() =>
				useFabVisibility({
					key: FAB_KEYS.ADMIN_SPEED_DIAL,
					initialHidden: false,
					onToggle,
				}),
			);

			act(() => {
				result.current.toggle();
			});

			// onToggle is called outside startTransition, before formAction inside it
			expect(callOrder[0]).toBe("onToggle");
		});

		it("does not call onToggle when toggle has not been called", () => {
			const onToggle = vi.fn();

			renderHook(() =>
				useFabVisibility({
					key: FAB_KEYS.ADMIN_SPEED_DIAL,
					initialHidden: false,
					onToggle,
				}),
			);

			expect(onToggle).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Multiple keys
	// -------------------------------------------------------------------------

	describe("key variants", () => {
		it("works with ADMIN_SPEED_DIAL key", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_SPEED_DIAL }));

			expect(result.current.isHidden).toBe(false);
		});

		it("works with STOREFRONT key", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.STOREFRONT }));

			expect(result.current.isHidden).toBe(false);
		});

		it("works with ADMIN_DASHBOARD key", () => {
			const { result } = renderHook(() => useFabVisibility({ key: FAB_KEYS.ADMIN_DASHBOARD }));

			expect(result.current.isHidden).toBe(false);
		});
	});
});
