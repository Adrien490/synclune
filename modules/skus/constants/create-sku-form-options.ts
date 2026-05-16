// Form options partagées entre client et serveur

import type { MediaData } from "@/modules/skus/types/sku-form.types";

export const createProductSkuFormOpts = {
	defaultValues: {
		productId: "",
		sku: "",
		priceInclTaxEuros: null as number | null,
		compareAtPriceEuros: undefined as number | undefined,
		inventory: null as number | null,
		isDefault: false,
		// "true"/"false" string pour matcher RadioGroupField (useFieldContext<string>).
		// Sans ça le radio « Actif » n'apparaît pas coché à la création.
		isActive: "true" as "true" | "false",
		colorIds: [] as string[],
		materialIds: [] as string[],
		size: "",
		/** Médias unifiés (1er = principal, ordre = position). Cap : ARRAY_LIMITS.SKU_MEDIA. */
		media: [] as MediaData[],
	},
};
