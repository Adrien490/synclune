"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";
import { generateSlug } from "@/shared/utils/generate-slug";
import { getColorInvalidationTags } from "../constants/cache";

/**
 * Server Action ADMIN pour dupliquer une couleur
 *
 * Cree une copie de la couleur avec:
 * - Un nouveau nom (original + " (copie)" ou " (copie N)")
 * - Un nouveau slug genere automatiquement
 * - isActive a false (pour eviter activation accidentelle)
 */
export async function duplicateColor(colorId: string): Promise<ActionState> {
	try {
		// 1. Verification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Recuperer la couleur originale
		const original = await prisma.color.findUnique({
			where: { id: colorId },
		});

		if (!original) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Couleur non trouvee",
			};
		}

		// 3. Generer un nouveau nom unique
		let newName = `${original.name} (copie)`;
		let suffix = 1;

		// Verifier si le nom existe deja et incrementer le suffixe si necessaire
		while (true) {
			const existing = await prisma.color.findFirst({
				where: { name: newName },
			});

			if (!existing) break;

			suffix++;
			newName = `${original.name} (copie ${suffix})`;

			// Securite: eviter boucle infinie
			if (suffix > 100) {
				return {
					status: ActionStatus.ERROR,
					message:
						"Impossible de generer un nom unique. Supprimez certaines copies.",
				};
			}
		}

		// 4. Generer un slug unique
		const slug = await generateSlug(prisma, "color", newName);

		// 5. Creer la copie
		const duplicate = await prisma.color.create({
			data: {
				name: newName,
				slug,
				hex: original.hex,
				isActive: false, // Desactive par defaut
			},
		});

		// 6. Revalider
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Couleur dupliquee: ${duplicate.name}`,
			data: { id: duplicate.id, name: duplicate.name },
		};
	} catch (error) {
		// console.error("[DUPLICATE_COLOR] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}
