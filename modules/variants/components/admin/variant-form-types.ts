import type { useCreateProductVariantForm } from "@/modules/variants/hooks/use-create-variant-form";

export interface VariantFormSharedProps {
	colors: Array<{ id: string; name: string; hex: string | null }>;
	materials: Array<{ id: string; name: string }>;
	product: { id: string; name: string };
	productSlug: string;
}

/**
 * Union des deux instances. Utilisé par les sous-composants partagés (sidebar-cards).
 * TanStack Form ne sait pas résoudre AppField sur une union, on cast donc côté consumer
 * — les champs des sub-cards sont strictement inclus dans les deux types
 * (colorId/materialId/size/active/priceEuros/stock).
 */
export type VariantFormInstance = ReturnType<typeof useCreateProductVariantForm>["form"];
