import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockDeleteColor, mockToggleColorStatus, mockDuplicateColor, mockRefreshColors } =
	vi.hoisted(() => ({
		mockDeleteColor: vi.fn(),
		mockToggleColorStatus: vi.fn(),
		mockDuplicateColor: vi.fn(),
		mockRefreshColors: vi.fn(),
	}));

vi.mock("@/modules/colors/actions/delete-color", () => ({
	deleteColor: mockDeleteColor,
}));
vi.mock("@/modules/colors/actions/toggle-color-status", () => ({
	toggleColorStatus: mockToggleColorStatus,
}));
vi.mock("@/modules/colors/actions/duplicate-color", () => ({
	duplicateColor: mockDuplicateColor,
}));
vi.mock("@/modules/colors/actions/refresh-colors", () => ({
	refreshColors: mockRefreshColors,
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useDeleteColor } from "../use-delete-color";
import { useToggleColorStatus } from "../use-toggle-color-status";
import { useDuplicateColor } from "../use-duplicate-color";
import { useRefreshColors } from "../use-refresh-colors";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useDeleteColor
// ============================================================================

describe("useDeleteColor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteColor.mockResolvedValue(SUCCESS);
	});

	it("returns action and isPending", () => {
		const { result } = renderHook(() => useDeleteColor());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteColor({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("OK");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteColor.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteColor({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useToggleColorStatus
// ============================================================================

describe("useToggleColorStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleColorStatus.mockResolvedValue({ ...SUCCESS, message: "Couleur activée" });
	});

	it("returns state, action, isPending, and toggleStatus", () => {
		const { result } = renderHook(() => useToggleColorStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.toggleStatus).toBe("function");
	});

	it("toggleStatus appends id and isActive to FormData", async () => {
		const { result } = renderHook(() => useToggleColorStatus());

		await act(async () => {
			result.current.toggleStatus("color-123", true);
		});

		const formData = mockToggleColorStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("color-123");
		expect(formData.get("isActive")).toBe("true");
	});

	it("toggleStatus appends isActive=false when deactivating", async () => {
		const { result } = renderHook(() => useToggleColorStatus());

		await act(async () => {
			result.current.toggleStatus("color-123", false);
		});

		const formData = mockToggleColorStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("isActive")).toBe("false");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleColorStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("color-123", true);
		});

		expect(onSuccess).toHaveBeenCalledWith("Couleur activée");
	});

	it("calls onError when action fails", async () => {
		mockToggleColorStatus.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useToggleColorStatus({ onError }));

		await act(async () => {
			result.current.toggleStatus("color-123", true);
		});

		expect(onError).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockToggleColorStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleColorStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("color-123", true);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useDuplicateColor
// ============================================================================

describe("useDuplicateColor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateColor.mockResolvedValue({
			status: "success" as const,
			message: "Couleur dupliquée",
			data: { id: "new-id", name: "Or - Copie", slug: "or-copie" },
		});
	});

	it("returns duplicate and isPending", () => {
		const { result } = renderHook(() => useDuplicateColor());
		expect(typeof result.current.duplicate).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("duplicate appends colorId to FormData", async () => {
		const { result } = renderHook(() => useDuplicateColor());

		await act(async () => {
			result.current.duplicate("color-123");
		});

		const formData = mockDuplicateColor.mock.calls[0]?.[1] as FormData;
		expect(formData.get("colorId")).toBe("color-123");
	});

	it("calls onSuccess with (message, { id, name, slug }) when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateColor({ onSuccess }));

		await act(async () => {
			result.current.duplicate("color-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Couleur dupliquée", {
			id: "new-id",
			name: "Or - Copie",
			slug: "or-copie",
		});
	});

	it("calls onError with message when action fails", async () => {
		mockDuplicateColor.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useDuplicateColor({ onError }));

		await act(async () => {
			result.current.duplicate("color-123");
		});

		expect(onError).toHaveBeenCalledWith("Failed");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDuplicateColor.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateColor({ onSuccess }));

		await act(async () => {
			result.current.duplicate("color-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useRefreshColors
// ============================================================================

describe("useRefreshColors", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshColors.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshColors());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshColors action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshColors());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshColors).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshColors({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshColors.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshColors({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
