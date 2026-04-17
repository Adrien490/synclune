import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockBulkUpdateCustomizationStatus,
	mockUpdateCustomizationNotes,
	mockUpdateCustomizationStatus,
	mockBulkDeleteCustomizationRequests,
	mockCancelCustomizationRequestCustomer,
	mockDeleteCustomizationRequest,
	mockUpdateCustomizationInspirationProducts,
} = vi.hoisted(() => ({
	mockBulkUpdateCustomizationStatus: vi.fn(),
	mockUpdateCustomizationNotes: vi.fn(),
	mockUpdateCustomizationStatus: vi.fn(),
	mockBulkDeleteCustomizationRequests: vi.fn(),
	mockCancelCustomizationRequestCustomer: vi.fn(),
	mockDeleteCustomizationRequest: vi.fn(),
	mockUpdateCustomizationInspirationProducts: vi.fn(),
}));

vi.mock("@/modules/customizations/actions/bulk-update-customization-status", () => ({
	bulkUpdateCustomizationStatus: mockBulkUpdateCustomizationStatus,
}));

vi.mock("@/modules/customizations/actions/update-customization-notes", () => ({
	updateCustomizationNotes: mockUpdateCustomizationNotes,
}));

vi.mock("@/modules/customizations/actions/update-customization-status", () => ({
	updateCustomizationStatus: mockUpdateCustomizationStatus,
}));

vi.mock("@/modules/customizations/actions/bulk-delete-customization-requests", () => ({
	bulkDeleteCustomizationRequests: mockBulkDeleteCustomizationRequests,
}));

vi.mock("@/modules/customizations/actions/cancel-customization-request-customer", () => ({
	cancelCustomizationRequestCustomer: mockCancelCustomizationRequestCustomer,
}));

vi.mock("@/modules/customizations/actions/delete-customization-request", () => ({
	deleteCustomizationRequest: mockDeleteCustomizationRequest,
}));

vi.mock("@/modules/customizations/actions/update-customization-inspiration-products", () => ({
	updateCustomizationInspirationProducts: mockUpdateCustomizationInspirationProducts,
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

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useBulkUpdateCustomizationStatus } from "../use-bulk-update-customization-status";
import { useUpdateCustomizationNotes } from "../use-update-customization-notes";
import { useUpdateCustomizationStatus } from "../use-update-customization-status";
import { useBulkDeleteCustomizationRequests } from "../use-bulk-delete-customization-requests";
import { useCancelCustomizationRequestCustomer } from "../use-cancel-customization-request-customer";
import { useDeleteCustomizationRequest } from "../use-delete-customization-request";
import { useUpdateCustomizationInspirationProducts } from "../use-update-customization-inspiration-products";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Erreur" };

afterEach(cleanup);

// ============================================================================
// useBulkUpdateCustomizationStatus
// ============================================================================

describe("useBulkUpdateCustomizationStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkUpdateCustomizationStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useBulkUpdateCustomizationStatus());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useBulkUpdateCustomizationStatus());

		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkUpdateCustomizationStatus({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkUpdateCustomizationStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkUpdateCustomizationStatus({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", () => {
		const { result } = renderHook(() => useBulkUpdateCustomizationStatus());

		expect(result.current.state).toBeUndefined();
	});
});

// ============================================================================
// useUpdateCustomizationNotes
// ============================================================================

describe("useUpdateCustomizationNotes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCustomizationNotes.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateCustomizationNotes());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useUpdateCustomizationNotes());

		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCustomizationNotes({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateCustomizationNotes.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCustomizationNotes({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", () => {
		const { result } = renderHook(() => useUpdateCustomizationNotes());

		expect(result.current.state).toBeUndefined();
	});
});

// ============================================================================
// useUpdateCustomizationStatus
// ============================================================================

describe("useUpdateCustomizationStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCustomizationStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateCustomizationStatus());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false on initial render", () => {
		const { result } = renderHook(() => useUpdateCustomizationStatus());

		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCustomizationStatus({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateCustomizationStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCustomizationStatus({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", () => {
		const { result } = renderHook(() => useUpdateCustomizationStatus());

		expect(result.current.state).toBeUndefined();
	});
});

// ============================================================================
// useBulkDeleteCustomizationRequests
// ============================================================================

describe("useBulkDeleteCustomizationRequests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeleteCustomizationRequests.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useBulkDeleteCustomizationRequests());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteCustomizationRequests({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeleteCustomizationRequests.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteCustomizationRequests({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useBulkDeleteCustomizationRequests());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockBulkDeleteCustomizationRequests).toHaveBeenCalledTimes(1);
	});

	it("state reflects error result on failure", async () => {
		mockBulkDeleteCustomizationRequests.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useBulkDeleteCustomizationRequests());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useCancelCustomizationRequestCustomer
// ============================================================================

describe("useCancelCustomizationRequestCustomer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCancelCustomizationRequestCustomer.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useCancelCustomizationRequestCustomer());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCancelCustomizationRequestCustomer({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockCancelCustomizationRequestCustomer.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCancelCustomizationRequestCustomer({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useCancelCustomizationRequestCustomer());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockCancelCustomizationRequestCustomer).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useDeleteCustomizationRequest
// ============================================================================

describe("useDeleteCustomizationRequest", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteCustomizationRequest.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useDeleteCustomizationRequest());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteCustomizationRequest({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteCustomizationRequest.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteCustomizationRequest({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useDeleteCustomizationRequest());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockDeleteCustomizationRequest).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useUpdateCustomizationInspirationProducts
// ============================================================================

describe("useUpdateCustomizationInspirationProducts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCustomizationInspirationProducts.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateCustomizationInspirationProducts());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCustomizationInspirationProducts({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateCustomizationInspirationProducts.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCustomizationInspirationProducts({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useUpdateCustomizationInspirationProducts());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockUpdateCustomizationInspirationProducts).toHaveBeenCalledTimes(1);
	});
});
