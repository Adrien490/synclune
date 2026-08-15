import type { useUpdateProductForm } from "@/modules/products/hooks/use-update-product-form";
import type { GetProductReturn } from "@/modules/products/types/product.types";

export interface EditProductFormProps {
	product: GetProductReturn;
	productTypes: Array<{ id: string; label: string }>;
	collections: Array<{ id: string; name: string }>;
	colors: Array<{ id: string; name: string; hex: string | null }>;
	materials: Array<{ id: string; name: string }>;
}

export type EditProductFormInstance = ReturnType<typeof useUpdateProductForm>["form"];
