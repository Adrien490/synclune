import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockCreateAddress, mockUpdateAddress, mockDeleteAddress, mockSetDefaultAddress } =
	vi.hoisted(() => ({
		mockCreateAddress: vi.fn(),
		mockUpdateAddress: vi.fn(),
		mockDeleteAddress: vi.fn(),
		mockSetDefaultAddress: vi.fn(),
	}));

vi.mock("@/modules/addresses/actions/create-address", () => ({
	createAddress: mockCreateAddress,
}));
vi.mock("@/modules/addresses/actions/update-address", () => ({
	updateAddress: mockUpdateAddress,
}));
vi.mock("@/modules/addresses/actions/delete-address", () => ({
	deleteAddress: mockDeleteAddress,
}));
vi.mock("@/modules/addresses/actions/set-default-address", () => ({
	setDefaultAddress: mockSetDefaultAddress,
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

import { useCreateAddress } from "../use-create-address";
import { useUpdateAddress } from "../use-update-address";
import { useDeleteAddress } from "../use-delete-address";
import { useSetDefaultAddress } from "../use-set-default-address";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Adresse créée" };
const ERROR = { status: "error" as const, message: "Erreur" };

// ============================================================================
// useCreateAddress
// ============================================================================

describe("useCreateAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCreateAddress.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useCreateAddress());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useCreateAddress());
		expect(result.current.isPending).toBe(false);
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateAddress({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Adresse créée");
	});

	it("does not call onSuccess when action fails", async () => {
		mockCreateAddress.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useCreateAddress({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state is updated after successful action", async () => {
		const { result } = renderHook(() => useCreateAddress());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});

	it("state is updated after failed action", async () => {
		mockCreateAddress.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useCreateAddress());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useCreateAddress());

		await expect(
			act(async () => {
				result.current.action(new FormData());
			}),
		).resolves.not.toThrow();
	});
});

// ============================================================================
// useUpdateAddress
// ============================================================================

describe("useUpdateAddress", () => {
	const ADDRESS_ID = "cuid2-test-address-id";

	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateAddress.mockResolvedValue({
			status: "success" as const,
			message: "Adresse mise à jour",
		});
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateAddress(ADDRESS_ID));
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateAddress(ADDRESS_ID, { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Adresse mise à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateAddress.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateAddress(ADDRESS_ID, { onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("binds addressId to the action", async () => {
		const { result } = renderHook(() => useUpdateAddress(ADDRESS_ID));

		await act(async () => {
			result.current.action(new FormData());
		});

		// updateAddress is called with (prevState, formData) after bind(null, addressId)
		// The bound call means mockUpdateAddress receives (addressId, prevState, formData)
		// prevState is undefined on the first call (initial state)
		expect(mockUpdateAddress).toHaveBeenCalledWith(ADDRESS_ID, undefined, expect.any(FormData));
	});

	it("state is updated after successful action", async () => {
		const { result } = renderHook(() => useUpdateAddress(ADDRESS_ID));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});
});

// ============================================================================
// useDeleteAddress
// ============================================================================

describe("useDeleteAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteAddress.mockResolvedValue({
			status: "success" as const,
			message: "Adresse supprimée",
		});
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useDeleteAddress());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("calls onSuccess with message when action succeeds via action", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteAddress({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Adresse supprimée");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteAddress.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteAddress({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("handle appends addressId to FormData and calls the action", async () => {
		const { result } = renderHook(() => useDeleteAddress());

		await act(async () => {
			result.current.handle("addr-cuid2-123");
		});

		const formData = mockDeleteAddress.mock.calls[0]?.[1] as FormData;
		expect(formData.get("addressId")).toBe("addr-cuid2-123");
	});

	it("calls onSuccess with message when handle succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteAddress({ onSuccess }));

		await act(async () => {
			result.current.handle("addr-cuid2-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Adresse supprimée");
	});

	it("does not call onSuccess when handle action fails", async () => {
		mockDeleteAddress.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteAddress({ onSuccess }));

		await act(async () => {
			result.current.handle("addr-cuid2-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state is updated after successful action", async () => {
		const { result } = renderHook(() => useDeleteAddress());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useDeleteAddress());

		await expect(
			act(async () => {
				result.current.handle("addr-cuid2-123");
			}),
		).resolves.not.toThrow();
	});
});

// ============================================================================
// useSetDefaultAddress
// ============================================================================

describe("useSetDefaultAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSetDefaultAddress.mockResolvedValue({
			status: "success" as const,
			message: "Adresse par défaut mise à jour",
		});
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useSetDefaultAddress());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("calls onSuccess with message when action succeeds via action", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultAddress({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Adresse par défaut mise à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockSetDefaultAddress.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultAddress({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("handle appends addressId to FormData and calls the action", async () => {
		const { result } = renderHook(() => useSetDefaultAddress());

		await act(async () => {
			result.current.handle("addr-cuid2-456");
		});

		const formData = mockSetDefaultAddress.mock.calls[0]?.[1] as FormData;
		expect(formData.get("addressId")).toBe("addr-cuid2-456");
	});

	it("calls onSuccess with message when handle succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultAddress({ onSuccess }));

		await act(async () => {
			result.current.handle("addr-cuid2-456");
		});

		expect(onSuccess).toHaveBeenCalledWith("Adresse par défaut mise à jour");
	});

	it("does not call onSuccess when handle action fails", async () => {
		mockSetDefaultAddress.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultAddress({ onSuccess }));

		await act(async () => {
			result.current.handle("addr-cuid2-456");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state is updated after successful action", async () => {
		const { result } = renderHook(() => useSetDefaultAddress());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state?.status).toBe("success");
	});

	it("state is updated after failed handle", async () => {
		mockSetDefaultAddress.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useSetDefaultAddress());

		await act(async () => {
			result.current.handle("addr-cuid2-456");
		});

		expect(result.current.state).toEqual(ERROR);
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useSetDefaultAddress());

		await expect(
			act(async () => {
				result.current.handle("addr-cuid2-456");
			}),
		).resolves.not.toThrow();
	});
});
