import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
	AdminListPendingProvider,
	useAdminListPendingContext,
	useAdminListPendingContextOptional,
} from "../admin-list-pending-context";
import { useAdminListBulkPendingStore } from "@/shared/stores/use-admin-list-bulk-pending-store";

function wrapper({ children }: { children: React.ReactNode }) {
	return <AdminListPendingProvider>{children}</AdminListPendingProvider>;
}

describe("AdminListPendingContext", () => {
	beforeEach(() => {
		useAdminListBulkPendingStore.setState({ pendingKind: null });
	});

	describe("useAdminListPendingContextOptional", () => {
		it("returns null when used outside Provider", () => {
			const { result } = renderHook(() => useAdminListPendingContextOptional());
			expect(result.current).toBeNull();
		});

		it("returns context value when wrapped in Provider", () => {
			const { result } = renderHook(() => useAdminListPendingContextOptional(), { wrapper });
			expect(result.current).not.toBeNull();
			expect(result.current?.pendingKind).toBeNull();
		});
	});

	describe("useAdminListPendingContext (mandatory)", () => {
		it("throws when used outside Provider", () => {
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => renderHook(() => useAdminListPendingContext())).toThrow(
				/must be used inside <AdminListPendingProvider>/,
			);
			consoleError.mockRestore();
		});

		it("returns the context shape when wrapped", () => {
			const { result } = renderHook(() => useAdminListPendingContext(), { wrapper });
			expect(result.current).toMatchObject({
				pendingIds: expect.any(Set),
				pendingKind: null,
				isPending: expect.any(Function),
				startPending: expect.any(Function),
				clearPending: expect.any(Function),
			});
		});
	});

	describe("state transitions", () => {
		it("startPending sets ids + kind", () => {
			const { result } = renderHook(() => useAdminListPendingContext(), { wrapper });
			act(() => {
				result.current.startPending(["pid_a", "pid_b"], "archive");
			});
			expect(result.current.pendingKind).toBe("archive");
			expect(result.current.isPending("pid_a")).toBe(true);
			expect(result.current.isPending("pid_b")).toBe(true);
			expect(result.current.isPending("pid_c")).toBe(false);
		});

		it("subsequent startPending overwrites previous state", () => {
			const { result } = renderHook(() => useAdminListPendingContext(), { wrapper });
			act(() => {
				result.current.startPending(["pid_a"], "archive");
			});
			act(() => {
				result.current.startPending(["pid_x", "pid_y"], "delete");
			});
			expect(result.current.pendingKind).toBe("delete");
			expect(result.current.isPending("pid_a")).toBe(false);
			expect(result.current.isPending("pid_x")).toBe(true);
			expect(result.current.isPending("pid_y")).toBe(true);
		});

		it("clearPending resets to empty state", () => {
			const { result } = renderHook(() => useAdminListPendingContext(), { wrapper });
			act(() => {
				result.current.startPending(["pid_a"], "restore");
			});
			act(() => {
				result.current.clearPending();
			});
			expect(result.current.pendingKind).toBeNull();
			expect(result.current.isPending("pid_a")).toBe(false);
		});
	});

	describe("global store sync", () => {
		it("publishes pendingKind to the global store on startPending", () => {
			const { result } = renderHook(() => useAdminListPendingContext(), { wrapper });
			act(() => {
				result.current.startPending(["pid_a"], "attach-collection");
			});
			expect(useAdminListBulkPendingStore.getState().pendingKind).toBe("attach-collection");
		});

		it("resets store to null on clearPending", () => {
			const { result } = renderHook(() => useAdminListPendingContext(), { wrapper });
			act(() => {
				result.current.startPending(["pid_a"], "status");
			});
			act(() => {
				result.current.clearPending();
			});
			expect(useAdminListBulkPendingStore.getState().pendingKind).toBeNull();
		});

		it("resets store to null on unmount", () => {
			const { result, unmount } = renderHook(() => useAdminListPendingContext(), { wrapper });
			act(() => {
				result.current.startPending(["pid_a"], "delete");
			});
			expect(useAdminListBulkPendingStore.getState().pendingKind).toBe("delete");
			unmount();
			expect(useAdminListBulkPendingStore.getState().pendingKind).toBeNull();
		});
	});

	describe("isolation", () => {
		it("renders children inside Provider without crashing", () => {
			const { container } = render(
				<AdminListPendingProvider>
					<span data-testid="child">child</span>
				</AdminListPendingProvider>,
			);
			expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
		});
	});
});
