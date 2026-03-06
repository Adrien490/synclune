import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockToastSuccess, mockToastError, mockToastWarning, mockToastLoading, mockToastDismiss } =
	vi.hoisted(() => ({
		mockToastSuccess: vi.fn(),
		mockToastError: vi.fn(),
		mockToastWarning: vi.fn(),
		mockToastLoading: vi.fn(() => "loading-toast-id"),
		mockToastDismiss: vi.fn(),
	}));

vi.mock("sonner", () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError,
		warning: mockToastWarning,
		loading: mockToastLoading,
		dismiss: mockToastDismiss,
	},
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
	isRedirectError: () => false,
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { useActionWithToast, useRefreshAction } from "../use-action-with-toast";
import { ActionStatus } from "@/shared/types/server-action";
import type { ActionState } from "@/shared/types/server-action";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const successState: ActionState = { status: ActionStatus.SUCCESS, message: "Succès" };
const errorState: ActionState = { status: ActionStatus.ERROR, message: "Erreur" };

function makeFormData(entries: Record<string, string> = {}): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		fd.append(key, value);
	}
	return fd;
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useActionWithToast
// ---------------------------------------------------------------------------

describe("useActionWithToast", () => {
	// -------------------------------------------------------------------------
	// Return value shape
	// -------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns state, action, and isPending", () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useActionWithToast(serverAction));

			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(result.current.isPending).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Toast on success
	// -------------------------------------------------------------------------

	describe("success toast", () => {
		it("shows a success toast with the action message", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useActionWithToast(serverAction));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastSuccess).toHaveBeenCalledWith("Succès");
		});

		it("does not show a success toast when showSuccessToast is false", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionWithToast(serverAction, { toastOptions: { showSuccessToast: false } }),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastSuccess).not.toHaveBeenCalled();
		});

		it("calls onSuccess callback with the action result", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useActionWithToast(serverAction, { onSuccess }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledWith(successState);
		});
	});

	// -------------------------------------------------------------------------
	// Toast on error
	// -------------------------------------------------------------------------

	describe("error toast", () => {
		it("shows an error toast with the action message", async () => {
			const serverAction = vi.fn().mockResolvedValue(errorState);
			const { result } = renderHook(() => useActionWithToast(serverAction));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastError).toHaveBeenCalledWith("Erreur");
		});

		it("does not show an error toast when showErrorToast is false", async () => {
			const serverAction = vi.fn().mockResolvedValue(errorState);
			const { result } = renderHook(() =>
				useActionWithToast(serverAction, { toastOptions: { showErrorToast: false } }),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastError).not.toHaveBeenCalled();
		});

		it("calls onError callback with the action result", async () => {
			const serverAction = vi.fn().mockResolvedValue(errorState);
			const onError = vi.fn();
			const { result } = renderHook(() => useActionWithToast(serverAction, { onError }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onError).toHaveBeenCalledWith(errorState);
		});
	});

	// -------------------------------------------------------------------------
	// Loading toast
	// -------------------------------------------------------------------------

	describe("loading toast", () => {
		it("shows a loading toast and dismisses it after action completes", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionWithToast(serverAction, {
					toastOptions: { loadingMessage: "Chargement..." },
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastLoading).toHaveBeenCalledWith("Chargement...");
			expect(mockToastDismiss).toHaveBeenCalledWith("loading-toast-id");
		});

		it("does not show a loading toast when loadingMessage is not provided", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useActionWithToast(serverAction));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastLoading).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Warning state
	// -------------------------------------------------------------------------

	describe("warning toast", () => {
		it("shows a warning toast for WARNING status", async () => {
			const warningState: ActionState = { status: ActionStatus.WARNING, message: "Attention" };
			const serverAction = vi.fn().mockResolvedValue(warningState);
			const { result } = renderHook(() => useActionWithToast(serverAction));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastWarning).toHaveBeenCalledWith("Attention");
		});
	});
});

// ---------------------------------------------------------------------------
// useRefreshAction
// ---------------------------------------------------------------------------

describe("useRefreshAction", () => {
	// -------------------------------------------------------------------------
	// Return value shape
	// -------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns state, action, isPending, and refresh", () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useRefreshAction(serverAction));

			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.refresh).toBe("function");
			expect(result.current.isPending).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// refresh() helper
	// -------------------------------------------------------------------------

	describe("refresh()", () => {
		it("calls the server action when refresh() is invoked", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useRefreshAction(serverAction));

			await act(async () => {
				await result.current.refresh();
			});

			expect(serverAction).toHaveBeenCalled();
		});

		it("does not show a success toast by default", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useRefreshAction(serverAction));

			await act(async () => {
				await result.current.refresh();
			});

			expect(mockToastSuccess).not.toHaveBeenCalled();
		});

		it("calls onSuccess callback when action succeeds", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useRefreshAction(serverAction, { onSuccess }));

			await act(async () => {
				await result.current.refresh();
			});

			expect(onSuccess).toHaveBeenCalled();
		});

		it("appends params entries to FormData when calling refresh()", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useRefreshAction(serverAction, { params: { id: "42", type: "product" } }),
			);

			await act(async () => {
				await result.current.refresh();
			});

			expect(serverAction).toHaveBeenCalled();
			const calledFormData = serverAction.mock.calls[0]?.[1] as FormData;
			expect(calledFormData.get("id")).toBe("42");
			expect(calledFormData.get("type")).toBe("product");
		});

		it("calls refresh() without params when none are provided", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useRefreshAction(serverAction));

			await act(async () => {
				await result.current.refresh();
			});

			expect(serverAction).toHaveBeenCalled();
			const calledFormData = serverAction.mock.calls[0]?.[1] as FormData;
			// FormData should be empty
			expect([...calledFormData.entries()]).toHaveLength(0);
		});
	});
});
