import { discountCodeSchema } from "../schemas/discount.schemas";

/**
 * Validator client TanStack Form pour le champ "code" promo.
 * Réutilise le schéma Zod serveur pour éviter le drift client/serveur.
 */
export function validateDiscountCodeField({ value }: { value: string }): string | undefined {
	const upper = value.toUpperCase();
	const result = discountCodeSchema.safeParse(upper);
	if (result.success) return undefined;
	return result.error.issues[0]?.message ?? "Code invalide";
}
