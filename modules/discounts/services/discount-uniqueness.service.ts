import { prisma } from "@/shared/lib/prisma";

/**
 * Vérifie si un code promo est disponible (non pris par un autre discount).
 *
 * Inclut les soft-deleted car le constraint Prisma `@unique` sur `code`
 * s'applique à toutes les lignes (un restore d'un code soft-deleted peut
 * conflicter avec un nouveau code créé entretemps).
 *
 * @param code - Code à vérifier (déjà sanitizé/uppercase)
 * @param excludeId - ID à exclure de la vérification (pour update)
 * @returns true si le code est libre
 */
export async function isCodeAvailable(code: string, excludeId?: string): Promise<boolean> {
	const existing = await prisma.discount.findUnique({
		where: { code },
		select: { id: true },
	});

	if (!existing) return true;
	if (excludeId && existing.id === excludeId) return true;

	return false;
}
