import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockToastSuccess, mockToastError, mockToastLoading, mockToastDismiss } = vi.hoisted(() => ({
	mockToastSuccess: vi.fn(),
	mockToastError: vi.fn(),
	mockToastLoading: vi.fn(() => "loading-toast-id"),
	mockToastDismiss: vi.fn(),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError,
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

import { useActionStateWithToast } from "../use-action-state-with-toast";
import { ActionStatus } from "@/shared/types/server-action";
import type { ActionState } from "@/shared/types/server-action";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface DuplicateData {
	id: string;
	name: string;
}

const successState: ActionState = {
	status: ActionStatus.SUCCESS,
	message: "Duplication réussie",
	data: { id: "abc", name: "Bague Or" } satisfies DuplicateData,
};

const errorState: ActionState = { status: ActionStatus.ERROR, message: "Échec duplication" };

function makeFormData(): FormData {
	return new FormData();
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useActionStateWithToast", () => {
	// -------------------------------------------------------------------------
	// Return shape
	// -------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns state, action, rawAction, and isPending", () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
				}),
			);

			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.rawAction).toBe("function");
			expect(result.current.isPending).toBe(false);
		});
	});

	// -------------------------------------------------------------------------
	// Loading toast
	// -------------------------------------------------------------------------

	describe("loading toast", () => {
		it("shows the loadingMessage as a loading toast and dismisses it on completion", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication en cours…",
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastLoading).toHaveBeenCalledWith("Duplication en cours…");
			expect(mockToastDismiss).toHaveBeenCalledWith("loading-toast-id");
		});
	});

	// -------------------------------------------------------------------------
	// Success toast
	// -------------------------------------------------------------------------

	describe("success toast", () => {
		it("shows a success toast by default", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastSuccess).toHaveBeenCalledWith("Duplication réussie");
		});

		it("hides the success toast when showSuccessToast is false", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
					showSuccessToast: false,
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockToastSuccess).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// onSuccess + extractData
	// -------------------------------------------------------------------------

	describe("onSuccess + extractData", () => {
		it("calls onSuccess with the message and the extracted data", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const onSuccess = vi.fn();
			const extractData = vi.fn((r: ActionState) => r.data as DuplicateData | null);

			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
					extractData,
					onSuccess,
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(extractData).toHaveBeenCalledWith(successState);
			expect(onSuccess).toHaveBeenCalledWith("Duplication réussie", {
				id: "abc",
				name: "Bague Or",
			});
		});

		it("passes null to onSuccess when extractData is not provided", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const onSuccess = vi.fn();

			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
					onSuccess,
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Duplication réussie", null);
		});

		it("passes null when extractData type guard returns null (narrowing failure)", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const onSuccess = vi.fn();
			const extractData = vi.fn(() => null);

			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
					extractData,
					onSuccess,
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Duplication réussie", null);
		});

		it("does not call onSuccess when the action fails", async () => {
			const serverAction = vi.fn().mockResolvedValue(errorState);
			const onSuccess = vi.fn();

			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
					onSuccess,
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// onError
	// -------------------------------------------------------------------------

	describe("onError", () => {
		it("calls onError when the server action returns ERROR", async () => {
			const serverAction = vi.fn().mockResolvedValue(errorState);
			const onError = vi.fn();

			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
					onError,
				}),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onError).toHaveBeenCalled();
			expect(mockToastError).toHaveBeenCalledWith("Échec duplication");
		});
	});

	// -------------------------------------------------------------------------
	// useOwnTransition toggle + rawAction bypass
	// -------------------------------------------------------------------------

	describe("transition wrapping", () => {
		it("exposes rawAction that bypasses the internal transition wrapping", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
				}),
			);

			expect(result.current.action).not.toBe(result.current.rawAction);

			await act(async () => {
				await result.current.rawAction(makeFormData());
			});

			expect(serverAction).toHaveBeenCalled();
		});

		it("returns the raw action as the public action when useOwnTransition is false", () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() =>
				useActionStateWithToast<DuplicateData>(serverAction, {
					loadingMessage: "Duplication…",
					useOwnTransition: false,
				}),
			);

			expect(result.current.action).toBe(result.current.rawAction);
		});
	});
});
