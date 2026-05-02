import type { useCreateProductSkuForm } from "@/modules/skus/hooks/use-create-sku-form";
import type { useUpdateProductSkuForm } from "@/modules/skus/hooks/use-update-sku-form";

export interface SkuFormSharedProps {
	colors: Array<{ id: string; name: string; hex: string }>;
	materials: Array<{ id: string; name: string }>;
	product: { id: string; title: string };
	productSlug: string;
}

export type CreateSkuFormInstance = ReturnType<typeof useCreateProductSkuForm>["form"];
export type UpdateSkuFormInstance = ReturnType<typeof useUpdateProductSkuForm>["form"];

/**
 * Union des deux instances. Utilisé par les sous-composants partagés (info-card, sidebar-cards, media-card).
 * TanStack Form ne sait pas résoudre AppField sur une union, on cast donc côté consumer
 * (`form as unknown as CreateSkuFormInstance`) — les champs des sub-cards sont strictement inclus
 * dans les deux types (color/material/size/isActive/isDefault/price/compareAt/inventory/primaryImage/galleryMedia).
 */
export type SkuFormInstance = CreateSkuFormInstance;
