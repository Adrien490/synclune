// Form options partagées entre client et serveur

import type { MediaType } from "@/app/generated/prisma/client";

export const createProductFormOpts = {
	defaultValues: {
		name: "",
		description: "",
		priceEuros: null as number | null,
		active: "false" as "true" | "false",
		typeId: "",
		collectionIds: [] as string[],
		media: [] as Array<{
			url: string;
			alt?: string;
			type: MediaType;
			blurDataUrl?: string;
		}>,
		initialVariant: {
			// Override du prix produit — vide = hérite du prix produit.
			priceEuros: "" as number | "",
			stock: 1,
			active: "true" as "true" | "false",
			colorId: "",
			materialId: "",
			size: "",
		},
	},
};
