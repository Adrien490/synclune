// Form options partagées entre client et serveur

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
			type: "IMAGE" | "VIDEO";
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
