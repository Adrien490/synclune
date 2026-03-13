import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockWithCallbacks, mockCreateToastCallbacks } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockWithCallbacks: vi.fn((action: unknown) => action),
	mockCreateToastCallbacks: vi.fn(() => ({})),
}));

let mockActionStateValue: [unknown, typeof mockAction, boolean] = [undefined, mockAction, false];

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: () => mockActionStateValue,
	};
});

vi.mock("@/shared/utils/with-callbacks", () => ({ withCallbacks: mockWithCallbacks }));
vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: mockCreateToastCallbacks,
}));
vi.mock("../../actions/toggle-announcement-status", () => ({
	toggleAnnouncementStatus: vi.fn(),
}));

import { useToggleAnnouncementStatus } from "../use-toggle-announcement-status";

// ============================================================================
// TESTS
// ============================================================================

describe("useToggleAnnouncementStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockActionStateValue = [undefined, mockAction, false];
	});

	it("should return state, action, isPending, and toggleStatus", () => {
		const { result } = renderHook(() => useToggleAnnouncementStatus());

		expect(result.current).toHaveProperty("state");
		expect(result.current).toHaveProperty("action");
		expect(result.current).toHaveProperty("isPending");
		expect(result.current).toHaveProperty("toggleStatus");
	});

	it("should not be pending initially", () => {
		const { result } = renderHook(() => useToggleAnnouncementStatus());

		expect(result.current.isPending).toBe(false);
	});

	it("should be pending when action is pending", () => {
		mockActionStateValue = [undefined, mockAction, true];

		const { result } = renderHook(() => useToggleAnnouncementStatus());

		expect(result.current.isPending).toBe(true);
	});

	it("should create FormData with id and isActive=true when activating", () => {
		const { result } = renderHook(() => useToggleAnnouncementStatus());

		act(() => {
			result.current.toggleStatus("ann_123", true);
		});

		expect(mockAction).toHaveBeenCalledTimes(1);
		const formData = mockAction.mock.calls[0]![0] as FormData;
		expect(formData.get("id")).toBe("ann_123");
		expect(formData.get("isActive")).toBe("true");
	});

	it("should create FormData with isActive=false when deactivating", () => {
		const { result } = renderHook(() => useToggleAnnouncementStatus());

		act(() => {
			result.current.toggleStatus("ann_123", false);
		});

		const formData = mockAction.mock.calls[0]![0] as FormData;
		expect(formData.get("isActive")).toBe("false");
	});

	it("should call onSuccess callback with message", () => {
		const onSuccess = vi.fn();

		let capturedOnSuccess: ((result: unknown) => void) | undefined;
		mockCreateToastCallbacks.mockImplementation((opts: Record<string, unknown>) => {
			capturedOnSuccess = opts.onSuccess as (result: unknown) => void;
			return opts;
		});

		renderHook(() => useToggleAnnouncementStatus({ onSuccess }));

		capturedOnSuccess?.({ message: "Annonce activée" });

		expect(onSuccess).toHaveBeenCalledWith("Annonce activée");
	});

	it("should call onError callback on error", () => {
		const onError = vi.fn();

		let capturedOnError: (() => void) | undefined;
		mockCreateToastCallbacks.mockImplementation((opts: Record<string, unknown>) => {
			capturedOnError = opts.onError as () => void;
			return opts;
		});

		renderHook(() => useToggleAnnouncementStatus({ onError }));

		capturedOnError?.();

		expect(onError).toHaveBeenCalled();
	});
});
