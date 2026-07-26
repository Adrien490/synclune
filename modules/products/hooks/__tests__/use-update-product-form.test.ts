import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUpdateProduct } = vi.hoisted(() => ({
	mockUpdateProduct: vi.fn(),
}));

vi.mock("@/modules/products/actions/update-product", () => ({
	updateProduct: mockUpdateProduct,
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

vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		store: { subscribe: vi.fn(), getState: vi.fn(() => ({ errors: [] })) },
	}),
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn((base: unknown) => base),
	useStore: vi.fn(() => []),
	useTransform: vi.fn((fn: unknown) => fn),
}));

vi.mock("@/modules/products/constants/update-product-form-options", () => ({
	editProductFormOpts: {
		defaultValues: {
			productId: "",
			title: "",
			description: "",
			typeId: "",
			collectionIds: [],
			status: "PUBLIC",
			defaultSku: {
				skuId: "",
				priceInclTaxEuros: 0,
				compareAtPriceEuros: undefined,
				inventory: 0,
				isActive: "true",
				colorIds: [],
				materialIds: [],
				size: "",
				media: [],
			},
		},
	},
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useUpdateProductForm } from "../use-update-product-form";
import type { GetProductReturn } from "@/modules/products/types/product.types";

// ============================================================================
// Fixtures
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Produit mis a jour" };
const ERROR = { status: "error" as const, message: "Erreur mise a jour" };

function makeProduct(overrides: Partial<GetProductReturn> = {}): GetProductReturn {
	return {
		id: "prod-123",
		title: "Bague Or",
		description: "Belle bague",
		status: "PUBLIC",
		type: { id: "type-1", name: "Bague" },
		collections: [],
		skus: [
			{
				id: "sku-1",
				isDefault: true,
				isActive: true,
				priceInclTax: 10000,
				compareAtPrice: null,
				inventory: 5,
				colors: [],
				materials: [],
				size: null,
				images: [],
			},
		],
		...overrides,
	} as unknown as GetProductReturn;
}

afterEach(cleanup);

// ============================================================================
// Tests
// ============================================================================

describe("useUpdateProductForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProduct.mockResolvedValue(SUCCESS);
	});

	it("returns form, state, action and isPending", () => {
		const { result } = renderHook(() => useUpdateProductForm({ product: makeProduct() }));

		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useUpdateProductForm({ product: makeProduct() }));

		expect(result.current.isPending).toBe(false);
	});

	it("state is undefined before any action is dispatched", () => {
		const { result } = renderHook(() => useUpdateProductForm({ product: makeProduct() }));

		expect(result.current.state).toBeUndefined();
	});

	it("state is updated to success after action completes", async () => {
		const { result } = renderHook(() => useUpdateProductForm({ product: makeProduct() }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});

	it("state is updated to error after failed action", async () => {
		mockUpdateProduct.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useUpdateProductForm({ product: makeProduct() }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	it("calls onSuccess with the message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useUpdateProductForm({ product: makeProduct(), onSuccess }),
		);

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Produit mis a jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateProduct.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useUpdateProductForm({ product: makeProduct(), onSuccess }),
		);

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when result has no message property", async () => {
		mockUpdateProduct.mockResolvedValue({ status: "success" as const });
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useUpdateProductForm({ product: makeProduct(), onSuccess }),
		);

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works when product has no skus", () => {
		const product = makeProduct({ skus: [] });
		const { result } = renderHook(() => useUpdateProductForm({ product }));

		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
	});

	it("works when product has no type", () => {
		const product = makeProduct({ type: null });
		const { result } = renderHook(() => useUpdateProductForm({ product }));

		expect(result.current.form).toBeDefined();
	});
});
