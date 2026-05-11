/**
 * Type predicate pour l'`ActionState.data` renvoyé par `createProductType`.
 * Mutualise le narrowing entre formulaire admin + dialog modale.
 */
export interface CreateProductTypeSuccessData {
	id: string;
	label: string;
}

export function isCreateProductTypeSuccessData(
	value: unknown,
): value is CreateProductTypeSuccessData {
	return (
		value !== null &&
		typeof value === "object" &&
		typeof (value as CreateProductTypeSuccessData).id === "string" &&
		typeof (value as CreateProductTypeSuccessData).label === "string"
	);
}
