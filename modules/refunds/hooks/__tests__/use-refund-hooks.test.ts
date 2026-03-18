import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRefreshRefunds,
	mockApproveRefund,
	mockBulkApproveRefunds,
	mockBulkRejectRefunds,
	mockCancelRefund,
	mockProcessRefund,
	mockRejectRefund,
} = vi.hoisted(() => ({
	mockRefreshRefunds: vi.fn(),
	mockApproveRefund: vi.fn(),
	mockBulkApproveRefunds: vi.fn(),
	mockBulkRejectRefunds: vi.fn(),
	mockCancelRefund: vi.fn(),
	mockProcessRefund: vi.fn(),
	mockRejectRefund: vi.fn(),
}));

vi.mock("@/modules/refunds/actions/refresh-refunds", () => ({
	refreshRefunds: mockRefreshRefunds,
}));
vi.mock("@/modules/refunds/actions/approve-refund", () => ({
	approveRefund: mockApproveRefund,
}));
vi.mock("@/modules/refunds/actions/bulk-approve-refunds", () => ({
	bulkApproveRefunds: mockBulkApproveRefunds,
}));
vi.mock("@/modules/refunds/actions/bulk-reject-refunds", () => ({
	bulkRejectRefunds: mockBulkRejectRefunds,
}));
vi.mock("@/modules/refunds/actions/cancel-refund", () => ({
	cancelRefund: mockCancelRefund,
}));
vi.mock("@/modules/refunds/actions/process-refund", () => ({
	processRefund: mockProcessRefund,
}));
vi.mock("@/modules/refunds/actions/reject-refund", () => ({
	rejectRefund: mockRejectRefund,
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

import { useRefreshRefunds } from "../use-refresh-refunds";
import { useApproveRefund } from "../use-approve-refund";
import { useBulkApproveRefunds } from "../use-bulk-approve-refunds";
import { useBulkRejectRefunds } from "../use-bulk-reject-refunds";
import { useCancelRefund } from "../use-cancel-refund";
import { useProcessRefund } from "../use-process-refund";
import { useRejectRefund } from "../use-reject-refund";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Erreur" };

// ============================================================================
// useRefreshRefunds
// ============================================================================

describe("useRefreshRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshRefunds.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshRefunds());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshRefunds action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshRefunds());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshRefunds).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshRefunds({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshRefunds.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshRefunds({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useApproveRefund
// ============================================================================

describe("useApproveRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockApproveRefund.mockResolvedValue({ ...SUCCESS, message: "Remboursement approuvé" });
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useApproveRefund());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useApproveRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockApproveRefund.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useApproveRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state reflects the action result", async () => {
		const { result } = renderHook(() => useApproveRefund());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});
});

// ============================================================================
// useBulkApproveRefunds
// ============================================================================

describe("useBulkApproveRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkApproveRefunds.mockResolvedValue({
			...SUCCESS,
			message: "3 remboursements approuvés",
		});
	});

	it("returns state, action, isPending, and approveRefunds", () => {
		const { result } = renderHook(() => useBulkApproveRefunds());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.approveRefunds).toBe("function");
	});

	it("approveRefunds sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkApproveRefunds());

		await act(async () => {
			result.current.approveRefunds(["id-1", "id-2"]);
		});

		const formData = mockBulkApproveRefunds.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkApproveRefunds({ onSuccess }));

		await act(async () => {
			result.current.approveRefunds(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("3 remboursements approuvés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkApproveRefunds.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkApproveRefunds({ onSuccess }));

		await act(async () => {
			result.current.approveRefunds(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkRejectRefunds
// ============================================================================

describe("useBulkRejectRefunds", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkRejectRefunds.mockResolvedValue({
			...SUCCESS,
			message: "2 remboursements rejetés",
		});
	});

	it("returns state, action, isPending, and rejectRefunds", () => {
		const { result } = renderHook(() => useBulkRejectRefunds());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.rejectRefunds).toBe("function");
	});

	it("rejectRefunds sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkRejectRefunds());

		await act(async () => {
			result.current.rejectRefunds(["id-1", "id-2"]);
		});

		const formData = mockBulkRejectRefunds.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("rejectRefunds appends optional reason to FormData", async () => {
		const { result } = renderHook(() => useBulkRejectRefunds());

		await act(async () => {
			result.current.rejectRefunds(["id-1"], "Demande non conforme");
		});

		const formData = mockBulkRejectRefunds.mock.calls[0]?.[1] as FormData;
		expect(formData.get("reason")).toBe("Demande non conforme");
	});

	it("does not append reason when not provided", async () => {
		const { result } = renderHook(() => useBulkRejectRefunds());

		await act(async () => {
			result.current.rejectRefunds(["id-1"]);
		});

		const formData = mockBulkRejectRefunds.mock.calls[0]?.[1] as FormData;
		expect(formData.get("reason")).toBeNull();
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkRejectRefunds({ onSuccess }));

		await act(async () => {
			result.current.rejectRefunds(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("2 remboursements rejetés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkRejectRefunds.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkRejectRefunds({ onSuccess }));

		await act(async () => {
			result.current.rejectRefunds(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useCancelRefund
// ============================================================================

describe("useCancelRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCancelRefund.mockResolvedValue({ ...SUCCESS, message: "Remboursement annulé" });
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useCancelRefund());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCancelRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockCancelRefund.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCancelRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useCancelRefund());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCancelRefund).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useProcessRefund
// ============================================================================

describe("useProcessRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockProcessRefund.mockResolvedValue({ ...SUCCESS, message: "Remboursement traité" });
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useProcessRefund());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useProcessRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockProcessRefund.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useProcessRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state reflects error on failure", async () => {
		mockProcessRefund.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useProcessRefund());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useRejectRefund
// ============================================================================

describe("useRejectRefund", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRejectRefund.mockResolvedValue({ ...SUCCESS, message: "Remboursement rejeté" });
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useRejectRefund());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRejectRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockRejectRefund.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRejectRefund({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("calls the action each time it is invoked", async () => {
		const { result } = renderHook(() => useRejectRefund());

		await act(async () => {
			result.current.action(new FormData());
		});
		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockRejectRefund).toHaveBeenCalledTimes(2);
	});
});
