// shared-code.ts - Form options partagées entre client et serveur
import type { ProductStatus } from "@/app/generated/prisma/client";

// Form options shared between client and server
export const createProductFormOpts = {
	defaultValues: {
		title: "",
		description: "",
		typeId: undefined as string | undefined,
		collectionIds: [] as string[],
		status: "DRAFT" as ProductStatus,
		initialSku: {
			sku: "",
			priceInclTaxEuros: 0,
			compareAtPriceEuros: undefined as number | undefined,
			inventory: 1,
			isDefault: true,
			isActive: true,
			colorId: "",
			materialId: "",
			size: "",
			primaryImage: undefined as
				| {
						url: string;
						thumbnailUrl?: string | null;
						thumbnailSmallUrl?: string | null;
						altText?: string;
						mediaType: "IMAGE" | "VIDEO";
				  }
				| undefined,
			galleryMedia: [] as Array<{
				url: string;
				thumbnailUrl?: string | null;
				thumbnailSmallUrl?: string | null;
				altText?: string;
				mediaType: "IMAGE" | "VIDEO";
			}>,
		},
	},
};
