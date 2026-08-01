import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRefreshMaterials,
	mockToggleMaterialStatus,
	mockDuplicateMaterial,
	mockDeleteMaterial,
} = vi.hoisted(() => ({
	mockRefreshMaterials: vi.fn(),
	mockToggleMaterialStatus: vi.fn(),
	mockDuplicateMaterial: vi.fn(),
	mockDeleteMaterial: vi.fn(),
}));

vi.mock("@/modules/materials/actions/refresh-materials", () => ({
	refreshMaterials: mockRefreshMaterials,
}));
vi.mock("@/modules/materials/actions/toggle-material-status", () => ({
	toggleMaterialStatus: mockToggleMaterialStatus,
}));
vi.mock("@/modules/materials/actions/duplicate-material", () => ({
	duplicateMaterial: mockDuplicateMaterial,
}));
vi.mock("@/modules/materials/actions/delete-material", () => ({
	deleteMaterial: mockDeleteMaterial,
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

import { useRefreshMaterials } from "../use-refresh-materials";
import { useToggleMaterialStatus } from "../use-toggle-material-status";
import { useDuplicateMaterial } from "../use-duplicate-material";
import { useDeleteMaterial } from "../use-delete-material";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useRefreshMaterials
// ============================================================================

describe("useRefreshMaterials", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshMaterials.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshMaterials());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshMaterials action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshMaterials());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshMaterials).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshMaterials({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshMaterials.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshMaterials({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useToggleMaterialStatus
// ============================================================================

describe("useToggleMaterialStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleMaterialStatus.mockResolvedValue({ ...SUCCESS, message: "Matériau activé" });
	});

	it("returns state, action, isPending, and toggleStatus", () => {
		const { result } = renderHook(() => useToggleMaterialStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.toggleStatus).toBe("function");
	});

	it("toggleStatus appends id and isActive=true to FormData", async () => {
		const { result } = renderHook(() => useToggleMaterialStatus());

		await act(async () => {
			result.current.toggleStatus("mat-123", true);
		});

		const formData = mockToggleMaterialStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("mat-123");
		expect(formData.get("isActive")).toBe("true");
	});

	it("toggleStatus appends isActive=false when deactivating", async () => {
		const { result } = renderHook(() => useToggleMaterialStatus());

		await act(async () => {
			result.current.toggleStatus("mat-123", false);
		});

		const formData = mockToggleMaterialStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("isActive")).toBe("false");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleMaterialStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("mat-123", true);
		});

		expect(onSuccess).toHaveBeenCalledWith("Matériau activé");
	});

	it("calls onError when action fails", async () => {
		mockToggleMaterialStatus.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useToggleMaterialStatus({ onError }));

		await act(async () => {
			result.current.toggleStatus("mat-123", true);
		});

		expect(onError).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockToggleMaterialStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleMaterialStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("mat-123", true);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// useCreateMaterial / useUpdateMaterial : hooks SUPPRIMÉS (aucun consommateur —
// leurs tests étaient les seuls importeurs, verts pour rien ; audit 2026-08-01).

// ============================================================================
// useDuplicateMaterial
// ============================================================================

describe("useDuplicateMaterial", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateMaterial.mockResolvedValue({
			status: "success" as const,
			message: "Matériau dupliqué",
			data: { id: "new-id", name: "Or - Copie", slug: "or-copie" },
		});
	});

	it("returns duplicate and isPending", () => {
		const { result } = renderHook(() => useDuplicateMaterial());
		expect(typeof result.current.duplicate).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("duplicate appends materialId to FormData", async () => {
		const { result } = renderHook(() => useDuplicateMaterial());

		await act(async () => {
			result.current.duplicate("mat-123");
		});

		const formData = mockDuplicateMaterial.mock.calls[0]?.[1] as FormData;
		expect(formData.get("materialId")).toBe("mat-123");
	});

	it("calls onSuccess with (message, { id, slug, displayName }) when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateMaterial({ onSuccess }));

		await act(async () => {
			result.current.duplicate("mat-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Matériau dupliqué", {
			id: "new-id",
			slug: "or-copie",
			displayName: "Or - Copie",
		});
	});

	it("calls onError with message when action fails", async () => {
		mockDuplicateMaterial.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useDuplicateMaterial({ onError }));

		await act(async () => {
			result.current.duplicate("mat-123");
		});

		expect(onError).toHaveBeenCalledWith("Failed");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDuplicateMaterial.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateMaterial({ onSuccess }));

		await act(async () => {
			result.current.duplicate("mat-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useDeleteMaterial
// ============================================================================

describe("useDeleteMaterial", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteMaterial.mockResolvedValue({ ...SUCCESS, message: "Matériau supprimé" });
	});

	it("returns state, action and isPending", () => {
		const { result } = renderHook(() => useDeleteMaterial());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteMaterial({ onSuccess }));

		const formData = new FormData();
		formData.set("id", "mat-123");
		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).toHaveBeenCalledWith("Matériau supprimé");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteMaterial.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteMaterial({ onSuccess }));

		const formData = new FormData();
		formData.set("id", "mat-123");
		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
