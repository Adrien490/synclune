"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success, error, notFound } from "@/shared/lib/actions";
import { updateTag } from "next/cache";
import { getDiscountInvalidationTags } from "../../constants/cache";

/**
 * Server Action ADMIN pour dupliquer un code promo
 *
 * Crée une copie du code promo avec:
 * - Un nouveau code (original + -COPY ou -COPY-N)
 * - usageCount remis à 0
 * - isActive à false (pour éviter activation accidentelle)
 */
export async function duplicateDiscount(discountId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Récupérer le code promo original
		const original = await prisma.discount.findUnique({
			where: { id: discountId },
		});

		if (!original) {
			return notFound("Code promo");
		}

		// 3. Générer un nouveau code unique
		let newCode = `${original.code}-COPY`;
		let suffix = 1;

		// Vérifier si le code existe déjà et incrémenter le suffixe si nécessaire
		while (true) {
			const existing = await prisma.discount.findUnique({
				where: { code: newCode },
			});

			if (!existing) break;

			suffix++;
			newCode = `${original.code}-COPY-${suffix}`;

			// Sécurité: éviter boucle infinie
			if (suffix > 100) {
				return error("Impossible de generer un code unique. Supprimez certaines copies.");
			}
		}

		// 4. Créer la copie
		const duplicate = await prisma.discount.create({
			data: {
				code: newCode,
				type: original.type,
				value: original.value,
				minOrderAmount: original.minOrderAmount,
				maxUsageCount: original.maxUsageCount,
				maxUsagePerUser: original.maxUsagePerUser,
				startsAt: original.startsAt,
				endsAt: original.endsAt,
				usageCount: 0,
				isActive: false, // Désactivé par défaut
			},
		});

		// 5. Invalider le cache
		getDiscountInvalidationTags(duplicate.code).forEach(tag => updateTag(tag));

		return success(`Code promo duplique: ${duplicate.code}`, { id: duplicate.id, code: duplicate.code });
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la duplication");
	}
}
