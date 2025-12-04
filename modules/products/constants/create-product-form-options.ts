// shared-code.ts - Form options partagées entre client et serveur
import type { ProductStatus } from "@/app/generated/prisma/client";

// Form options shared between client and server
export const createProductFormOpts = {
	defaultValues: {
		title: "",
		description: "",
		typeId: undefined as string | undefined,
		collectionIds: [] as string[],
		status: "PUBLIC" as ProductStatus,
		initialSku: {
			sku: "",
			priceInclTaxEuros: null as number | null,
			compareAtPriceEuros: undefined as number | undefined,
			inventory: 1,
			isDefault: true,
			isActive: true,
			colorId: "",
			materialId: "",
			size: "",
			media: [] as Array<{
				url: string;
				thumbnailUrl?: string | null;
				thumbnailSmallUrl?: string | null;
				altText?: string;
				mediaType: "IMAGE" | "VIDEO";
			}>,
		},
	},
};
