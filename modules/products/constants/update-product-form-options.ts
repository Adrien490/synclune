// Form options for editing a product

import type { MediaType } from "@/app/generated/prisma/client";

export const editProductFormOpts = {
	defaultValues: {
		productId: "",
		name: "",
		description: "",
		priceEuros: 0,
		active: "true" as "true" | "false",
		typeId: "",
		collectionIds: [] as string[],
		media: [] as Array<{
			url: string;
			alt?: string;
			type: MediaType;
			blurDataUrl?: string;
		}>,
		defaultVariant: {
			variantId: "",
			// Override du prix produit — vide = hérite du prix produit.
			priceEuros: "" as number | "",
			originalStock: 0,
			stock: 0,
			active: "true" as "true" | "false",
			colorId: "",
			materialId: "",
			size: "",
		},
	},
};
