import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockUpdateOrderStatus,
	mockDeleteOrder,
	mockRefreshOrders,
	mockCancelOrder,
	mockMarkAsPaid,
	mockMarkAsShipped,
	mockResendOrderEmail,
	mockUpdateTracking,
} = vi.hoisted(() => ({
	mockDeleteOrder: vi.fn(),
	mockRefreshOrders: vi.fn(),
	mockCancelOrder: vi.fn(),
	mockUpdateOrderStatus: vi.fn(),
	mockMarkAsPaid: vi.fn(),
	mockMarkAsShipped: vi.fn(),
	mockResendOrderEmail: vi.fn(),
	mockUpdateTracking: vi.fn(),
}));

vi.mock("@/modules/orders/actions/delete-order", () => ({
	deleteOrder: mockDeleteOrder,
}));
vi.mock("@/modules/orders/actions/refresh-orders", () => ({
	refreshOrders: mockRefreshOrders,
}));
vi.mock("@/modules/orders/actions/cancel-order", () => ({
	cancelOrder: mockCancelOrder,
}));
vi.mock("@/modules/orders/actions/update-order-status", () => ({
	updateOrderStatus: mockUpdateOrderStatus,
}));
vi.mock("@/modules/orders/actions/mark-as-paid", () => ({
	markAsPaid: mockMarkAsPaid,
}));
vi.mock("@/modules/orders/actions/mark-as-shipped", () => ({
	markAsShipped: mockMarkAsShipped,
}));
vi.mock("@/modules/orders/actions/resend-order-email", () => ({
	resendOrderEmail: mockResendOrderEmail,
}));
vi.mock("@/modules/orders/actions/update-tracking", () => ({
	updateTracking: mockUpdateTracking,
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({ store: {} })),
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn(),
	useStore: vi.fn(() => []),
	useTransform: vi.fn(),
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

import { useDeleteOrder } from "../use-delete-order";
import { useRefreshOrders } from "../use-refresh-orders";
import { useCancelOrder } from "../use-cancel-order";
import { useMarkAsPaid } from "../use-mark-as-paid";
import { useUpdateOrderStatus } from "../use-update-order-status";
import { useMarkAsShippedForm } from "../use-mark-as-shipped-form";
import { useResendOrderEmail } from "../use-resend-order-email";
import { useUpdateTrackingForm } from "../use-update-tracking-form";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useDeleteOrder
// ============================================================================

describe("useDeleteOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteOrder.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useDeleteOrder());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useDeleteOrder());
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteOrder({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteOrder.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteOrder({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useDeleteOrder());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockDeleteOrder).toHaveBeenCalledTimes(1);
	});

	it("state reflects the action result after invocation", async () => {
		const { result } = renderHook(() => useDeleteOrder());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state reflects error result on failure", async () => {
		mockDeleteOrder.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useDeleteOrder());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useRefreshOrders
// ============================================================================

describe("useRefreshOrders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshOrders.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshOrders());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useRefreshOrders());
		expect(result.current.isPending).toBe(false);
	});

	it("calls the underlying action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshOrders());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshOrders).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshOrders({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshOrders.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshOrders({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useRefreshOrders());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshOrders).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useCancelOrder
// ============================================================================

describe("useCancelOrder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCancelOrder.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useCancelOrder());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useCancelOrder());
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCancelOrder({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockCancelOrder.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCancelOrder({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useCancelOrder());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCancelOrder).toHaveBeenCalledTimes(1);
	});

	it("state reflects the success result", async () => {
		const { result } = renderHook(() => useCancelOrder());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state reflects the error result on failure", async () => {
		mockCancelOrder.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useCancelOrder());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useMarkAsDelivered
// ============================================================================

describe("useUpdateOrderStatus(delivered)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateOrderStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("delivered"));
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("delivered"));
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateOrderStatus("delivered", { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateOrderStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateOrderStatus("delivered", { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("delivered"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockUpdateOrderStatus).toHaveBeenCalledTimes(1);
	});

	it("state reflects success result", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("delivered"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state reflects error result on failure", async () => {
		mockUpdateOrderStatus.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useUpdateOrderStatus("delivered"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useMarkAsPaid
// ============================================================================

describe("useMarkAsPaid", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMarkAsPaid.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useMarkAsPaid());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useMarkAsPaid());
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useMarkAsPaid({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockMarkAsPaid.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useMarkAsPaid({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useMarkAsPaid());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
	});

	it("state reflects success result", async () => {
		const { result } = renderHook(() => useMarkAsPaid());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state reflects error on failure", async () => {
		mockMarkAsPaid.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useMarkAsPaid());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useMarkAsProcessing
// ============================================================================

describe("useUpdateOrderStatus(processing)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateOrderStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("processing"));
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("processing"));
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateOrderStatus("processing", { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateOrderStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateOrderStatus("processing", { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("processing"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockUpdateOrderStatus).toHaveBeenCalledTimes(1);
	});

	it("state reflects success result", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("processing"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state reflects error on failure", async () => {
		mockUpdateOrderStatus.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useUpdateOrderStatus("processing"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useMarkAsReturned
// ============================================================================

describe("useUpdateOrderStatus(returned)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateOrderStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("returned"));
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("returned"));
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateOrderStatus("returned", { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateOrderStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateOrderStatus("returned", { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("returned"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockUpdateOrderStatus).toHaveBeenCalledTimes(1);
	});

	it("state reflects success result", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("returned"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state reflects error on failure", async () => {
		mockUpdateOrderStatus.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useUpdateOrderStatus("returned"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useMarkAsShippedForm
// ============================================================================

describe("useMarkAsShippedForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockMarkAsShipped.mockResolvedValue({ ...SUCCESS, message: "Commande expédiée" });
	});

	it("returns form, state, action and isPending", () => {
		const { result } = renderHook(() => useMarkAsShippedForm({ orderId: "order-123" }));
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useMarkAsShippedForm({ orderId: "order-123" }));
		expect(result.current.isPending).toBe(false);
	});

	it("accepts an onSuccess callback option without error", () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useMarkAsShippedForm({ orderId: "order-123", onSuccess }));
		expect(result.current.form).toBeDefined();
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useMarkAsShippedForm({ orderId: "order-123", onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Commande expédiée");
	});

	it("does not call onSuccess when action fails", async () => {
		mockMarkAsShipped.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useMarkAsShippedForm({ orderId: "order-123", onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("calls the action when action is invoked", async () => {
		const { result } = renderHook(() => useMarkAsShippedForm({ orderId: "order-123" }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockMarkAsShipped).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useResendOrderEmail
// ============================================================================

describe("useResendOrderEmail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResendOrderEmail.mockResolvedValue(SUCCESS);
	});

	it("returns resend and isPending", () => {
		const { result } = renderHook(() => useResendOrderEmail());
		expect(typeof result.current.resend).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useResendOrderEmail());
		expect(result.current.isPending).toBe(false);
	});

	it("resend calls the action with orderId and emailType", async () => {
		const { result } = renderHook(() => useResendOrderEmail());

		await act(async () => {
			result.current.resend("order-123", "confirmation");
		});

		expect(mockResendOrderEmail).toHaveBeenCalledWith("order-123", "confirmation");
	});

	it("resend works with all supported email types", async () => {
		const emailTypes = ["confirmation", "shipping"] as const;

		for (const emailType of emailTypes) {
			vi.clearAllMocks();
			mockResendOrderEmail.mockResolvedValue(SUCCESS);
			const { result } = renderHook(() => useResendOrderEmail());

			await act(async () => {
				result.current.resend("order-abc", emailType);
			});

			expect(mockResendOrderEmail).toHaveBeenCalledWith("order-abc", emailType);
		}
	});

	it("can be called multiple times with different orders", async () => {
		const { result } = renderHook(() => useResendOrderEmail());

		await act(async () => {
			result.current.resend("order-1", "confirmation");
		});
		await act(async () => {
			result.current.resend("order-2", "shipping");
		});

		expect(mockResendOrderEmail).toHaveBeenCalledTimes(2);
		expect(mockResendOrderEmail).toHaveBeenNthCalledWith(1, "order-1", "confirmation");
		expect(mockResendOrderEmail).toHaveBeenNthCalledWith(2, "order-2", "shipping");
	});
});

// ============================================================================
// useRevertToProcessing
// ============================================================================

describe("useUpdateOrderStatus(revert-to-processing)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateOrderStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("revert-to-processing"));
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useUpdateOrderStatus("revert-to-processing"));
		expect(result.current.isPending).toBe(false);
	});

	it("invokes the underlying action when action is called", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("revert-to-processing"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockUpdateOrderStatus).toHaveBeenCalledTimes(1);
	});

	it("state reflects success result", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("revert-to-processing"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state reflects error on failure", async () => {
		mockUpdateOrderStatus.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useUpdateOrderStatus("revert-to-processing"));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	it("can be called multiple times", async () => {
		const { result } = renderHook(() => useUpdateOrderStatus("revert-to-processing"));

		await act(async () => {
			result.current.action(new FormData());
		});
		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockUpdateOrderStatus).toHaveBeenCalledTimes(2);
	});
});

// ============================================================================
// useUpdateTrackingForm
// ============================================================================

describe("useUpdateTrackingForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateTracking.mockResolvedValue({ ...SUCCESS, message: "Tracking mis à jour" });
	});

	it("returns form, state, action and isPending", () => {
		const { result } = renderHook(() => useUpdateTrackingForm({ orderId: "order-123" }));
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useUpdateTrackingForm({ orderId: "order-123" }));
		expect(result.current.isPending).toBe(false);
	});

	it("accepts initial tracking values without error", () => {
		const { result } = renderHook(() =>
			useUpdateTrackingForm({
				orderId: "order-123",
				initialTrackingNumber: "1Z999AA10123456784",
				initialTrackingUrl: "https://tracking.example.com/1Z999AA10123456784",
				initialCarrier: "ups",
			}),
		);
		expect(result.current.form).toBeDefined();
	});

	it("accepts an onSuccess callback option", () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateTrackingForm({ orderId: "order-123", onSuccess }));
		expect(result.current.form).toBeDefined();
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateTrackingForm({ orderId: "order-123", onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Tracking mis à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateTracking.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateTrackingForm({ orderId: "order-123", onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("calls the action when action is invoked", async () => {
		const { result } = renderHook(() => useUpdateTrackingForm({ orderId: "order-123" }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockUpdateTracking).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
