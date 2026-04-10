import type { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";

export interface CreateProductFormProps {
	productTypes: Array<{ id: string; label: string }>;
	collections: Array<{ id: string; name: string }>;
	colors: Array<{ id: string; name: string; hex: string }>;
	materials: Array<{ id: string; name: string }>;
}

export type CreateProductFormInstance = ReturnType<typeof useCreateProductForm>["form"];
