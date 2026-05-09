import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
	mockToastSuccess: vi.fn(),
	mockToastError: vi.fn(),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		success: mockToastSuccess,
		error: mockToastError,
	},
}));

// Stub the bulk-selection-context export with a stable, controllable mock so we
// don't have to set up an admin list selection store + provider for every test.
const mockClear = vi.fn();
vi.mock("@/shared/components/data-table", () => ({
	useBulkSelectionContext: () => ({
		clear: mockClear,
		// Other fields aren't read by the hook — provide minimal shape for typing.
		selectedIds: new Set<string>(),
		pageItemIds: [],
		selectedCount: 0,
		selectedOnPage: 0,
		isSelected: () => false,
		toggle: () => undefined,
		togglePage: () => undefined,
		pageState: "none" as const,
		selectionMode: false,
		enterSelectionMode: () => undefined,
		exitSelectionMode: () => undefined,
		selectAllVisible: () => undefined,
	}),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { useBulkActionWithToast } from "../use-bulk-action-with-toast";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const successState: ActionState = { status: ActionStatus.SUCCESS, message: "OK" };
const errorState: ActionState = { status: ActionStatus.ERROR, message: "KO" };

function makeFormData(entries: Record<string, string> = {}): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(entries)) {
		fd.append(key, value);
	}
	return fd;
}

// Optional wrapper if a test ever needs a real provider — kept minimal.
const noopWrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

beforeEach(() => {
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBulkActionWithToast", () => {
	describe("return value shape", () => {
		it("returns state, isPending, submit", () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useBulkActionWithToast(serverAction), {
				wrapper: noopWrapper,
			});

			expect(result.current.state).toBeUndefined();
			expect(result.current.isPending).toBe(false);
			expect(typeof result.current.submit).toBe("function");
		});
	});

	describe("on success", () => {
		it("toasts success and calls clear()", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const { result } = renderHook(() => useBulkActionWithToast(serverAction), {
				wrapper: noopWrapper,
			});

			await act(async () => {
				result.current.submit(makeFormData());
			});

			expect(serverAction).toHaveBeenCalledOnce();
			expect(mockToastSuccess).toHaveBeenCalledWith("OK");
			expect(mockClear).toHaveBeenCalledOnce();
		});

		it("invokes the optional onSuccess callback with the action result", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useBulkActionWithToast(serverAction, { onSuccess }), {
				wrapper: noopWrapper,
			});

			await act(async () => {
				result.current.submit(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledWith(successState);
		});
	});

	describe("on error", () => {
		it("toasts error and does NOT call clear()", async () => {
			const serverAction = vi.fn().mockResolvedValue(errorState);
			const { result } = renderHook(() => useBulkActionWithToast(serverAction), {
				wrapper: noopWrapper,
			});

			await act(async () => {
				result.current.submit(makeFormData());
			});

			expect(mockToastError).toHaveBeenCalledWith("KO");
			expect(mockClear).not.toHaveBeenCalled();
		});
	});

	describe("undo flow", () => {
		it("attaches an Annuler action to the success toast when a snapshot is provided", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const buildUndoFormData = vi.fn((snap: { id: string }) =>
				makeFormData({ undoneId: snap.id }),
			);

			const { result } = renderHook(
				() =>
					useBulkActionWithToast<{ id: string }>(serverAction, {
						undo: { buildUndoFormData },
					}),
				{ wrapper: noopWrapper },
			);

			await act(async () => {
				result.current.submit(makeFormData(), { id: "abc" });
			});

			expect(mockToastSuccess).toHaveBeenCalledOnce();
			const [, opts] = mockToastSuccess.mock.calls[0] as [
				string,
				{ action?: { label: string; onClick: () => void } },
			];
			expect(opts.action?.label).toBe("Annuler");
			// Undo not run yet — snapshot only consumed if the user taps the button.
			expect(buildUndoFormData).not.toHaveBeenCalled();
		});

		it("re-invokes the action with the inverted FormData when Annuler is tapped", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const buildUndoFormData = (snap: { id: string }) => makeFormData({ undoneId: snap.id });

			const { result } = renderHook(
				() =>
					useBulkActionWithToast<{ id: string }>(serverAction, {
						undo: { buildUndoFormData, successMessage: "Restauré" },
					}),
				{ wrapper: noopWrapper },
			);

			await act(async () => {
				result.current.submit(makeFormData(), { id: "xyz" });
			});

			const [, opts] = mockToastSuccess.mock.calls[0] as [
				string,
				{ action: { onClick: () => void } },
			];

			await act(async () => {
				opts.action.onClick();
				// flush microtasks for the inner async undo invocation
				await Promise.resolve();
				await Promise.resolve();
			});

			expect(serverAction).toHaveBeenCalledTimes(2);
			const undoCall = serverAction.mock.calls[1]?.[1] as FormData;
			expect(undoCall.get("undoneId")).toBe("xyz");
			expect(mockToastSuccess).toHaveBeenLastCalledWith("Restauré");
		});

		it("clears the snapshot ref after a successful submit (no undo across actions)", async () => {
			const serverAction = vi.fn().mockResolvedValue(successState);
			const buildUndoFormData = vi.fn(() => makeFormData());

			const { result } = renderHook(
				() =>
					useBulkActionWithToast<{ id: string }>(serverAction, {
						undo: { buildUndoFormData },
					}),
				{ wrapper: noopWrapper },
			);

			// First submit with snapshot
			await act(async () => {
				result.current.submit(makeFormData(), { id: "first" });
			});

			expect(mockToastSuccess).toHaveBeenCalledOnce();
			mockToastSuccess.mockClear();

			// Second submit WITHOUT snapshot — toast should NOT have undo button
			await act(async () => {
				result.current.submit(makeFormData());
			});

			expect(mockToastSuccess).toHaveBeenCalledOnce();
			const [, opts] = mockToastSuccess.mock.calls[0] as [string, { action?: unknown } | undefined];
			expect(opts?.action).toBeUndefined();
		});
	});
});
