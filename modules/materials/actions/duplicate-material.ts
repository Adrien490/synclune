"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath, updateTag } from "next/cache";
import { generateSlug } from "@/shared/utils/generate-slug";
import { getMaterialInvalidationTags } from "../constants/cache";

/**
 * Server Action ADMIN pour dupliquer un materiau
 *
 * Cree une copie du materiau avec:
 * - Un nouveau nom (original + " (copie)" ou " (copie N)")
 * - Un nouveau slug genere automatiquement
 * - isActive a false (pour eviter activation accidentelle)
 */
export async function duplicateMaterial(materialId: string): Promise<ActionState> {
	try {
		// 1. Verification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Recuperer le materiau original
		const original = await prisma.material.findUnique({
			where: { id: materialId },
		});

		if (!original) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Materiau non trouve",
			};
		}

		// 3. Generer un nouveau nom unique
		let newName = `${original.name} (copie)`;
		let suffix = 1;

		// Verifier si le nom existe deja et incrementer le suffixe si necessaire
		while (true) {
			const existing = await prisma.material.findFirst({
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
		const slug = await generateSlug(prisma, "material", newName);

		// 5. Creer la copie
		const duplicate = await prisma.material.create({
			data: {
				name: newName,
				slug,
				description: original.description,
				isActive: false, // Desactive par defaut
			},
		});

		// 6. Revalider
		revalidatePath("/admin/catalogue/materiaux");
		const tags = getMaterialInvalidationTags(duplicate.slug);
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Materiau duplique: ${duplicate.name}`,
			data: { id: duplicate.id, name: duplicate.name },
		};
	} catch (error) {
		// console.error("[DUPLICATE_MATERIAL] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error ? error.message : "Une erreur est survenue",
		};
	}
}
