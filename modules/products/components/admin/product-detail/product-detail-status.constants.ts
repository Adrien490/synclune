import type { GetProductReturn } from "@/modules/products/types/product.types";

export const PRODUCT_STATUS_CONFIG: Record<
	GetProductReturn["status"],
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	PUBLIC: { label: "Public", variant: "default" },
	DRAFT: { label: "Brouillon", variant: "secondary" },
	ARCHIVED: { label: "Archivé", variant: "outline" },
};
