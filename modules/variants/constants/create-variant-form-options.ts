// Form options partagées entre client et serveur

export const createProductVariantFormOpts = {
	defaultValues: {
		productId: "",
		// Override du prix produit — vide = hérite du prix produit.
		priceEuros: "" as number | "",
		stock: null as number | null,
		// "true"/"false" string pour matcher RadioGroupField (useFieldContext<string>).
		// Sans ça le radio « Actif » n'apparaît pas coché à la création.
		active: "true" as "true" | "false",
		colorId: "",
		materialId: "",
		size: "",
	},
};
