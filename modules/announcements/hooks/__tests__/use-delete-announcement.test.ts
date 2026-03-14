import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFormAction, mockWithCallbacks, mockCreateToastCallbacks } = vi.hoisted(() => ({
	mockFormAction: vi.fn(),
	mockWithCallbacks: vi.fn((action: unknown) => action),
	mockCreateToastCallbacks: vi.fn((..._args: unknown[]) => ({})),
}));

let mockActionStateValue: [unknown, typeof mockFormAction, boolean] = [
	undefined,
	mockFormAction,
	false,
];

let mockTransitionPending = false;
const mockStartTransition = vi.fn((fn: () => void) => fn());

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: () => mockActionStateValue,
		useTransition: () => [mockTransitionPending, mockStartTransition],
	};
});

vi.mock("@/shared/utils/with-callbacks", () => ({ withCallbacks: mockWithCallbacks }));
vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: mockCreateToastCallbacks,
}));
vi.mock("../../actions/delete-announcement", () => ({
	deleteAnnouncement: vi.fn(),
}));

import { useDeleteAnnouncement } from "../use-delete-announcement";

// ============================================================================
// TESTS
// ============================================================================

describe("useDeleteAnnouncement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockActionStateValue = [undefined, mockFormAction, false];
		mockTransitionPending = false;
	});

	it("should return state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useDeleteAnnouncement());

		expect(result.current).toHaveProperty("state");
		expect(result.current).toHaveProperty("action");
		expect(result.current).toHaveProperty("isPending");
		expect(result.current).toHaveProperty("handle");
	});

	it("should not be pending initially", () => {
		const { result } = renderHook(() => useDeleteAnnouncement());

		expect(result.current.isPending).toBe(false);
	});

	it("should be pending when form is pending", () => {
		mockActionStateValue = [undefined, mockFormAction, true];

		const { result } = renderHook(() => useDeleteAnnouncement());

		expect(result.current.isPending).toBe(true);
	});

	it("should be pending when transition is pending", () => {
		mockTransitionPending = true;

		const { result } = renderHook(() => useDeleteAnnouncement());

		expect(result.current.isPending).toBe(true);
	});

	it("should create FormData with announcement id when handle is called", () => {
		const { result } = renderHook(() => useDeleteAnnouncement());

		act(() => {
			result.current.handle("ann_123");
		});

		expect(mockFormAction).toHaveBeenCalledTimes(1);
		const formData = mockFormAction.mock.calls[0]![0] as FormData;
		expect(formData.get("id")).toBe("ann_123");
	});

	it("should use startTransition when calling handle", () => {
		const { result } = renderHook(() => useDeleteAnnouncement());

		act(() => {
			result.current.handle("ann_123");
		});

		expect(mockStartTransition).toHaveBeenCalled();
	});

	it("should call withCallbacks with createToastCallbacks", () => {
		renderHook(() => useDeleteAnnouncement());

		expect(mockWithCallbacks).toHaveBeenCalled();
		expect(mockCreateToastCallbacks).toHaveBeenCalled();
	});

	it("should call onSuccess callback with message when provided", () => {
		const onSuccess = vi.fn();

		// Capture the toast callbacks to test the onSuccess handler
		let capturedOnSuccess: ((result: unknown) => void) | undefined;
		mockCreateToastCallbacks.mockImplementation((...args: unknown[]) => {
			const opts = args[0] as Record<string, unknown>;
			capturedOnSuccess = opts.onSuccess as (result: unknown) => void;
			return opts;
		});

		renderHook(() => useDeleteAnnouncement({ onSuccess }));

		// Simulate the callback being invoked with a success result
		capturedOnSuccess?.({ message: "Annonce supprimée" });

		expect(onSuccess).toHaveBeenCalledWith("Annonce supprimée");
	});

	it("should not call onSuccess when result has no message", () => {
		const onSuccess = vi.fn();

		let capturedOnSuccess: ((result: unknown) => void) | undefined;
		mockCreateToastCallbacks.mockImplementation((...args: unknown[]) => {
			const opts = args[0] as Record<string, unknown>;
			capturedOnSuccess = opts.onSuccess as (result: unknown) => void;
			return opts;
		});

		renderHook(() => useDeleteAnnouncement({ onSuccess }));

		capturedOnSuccess?.({ status: "success" });

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
