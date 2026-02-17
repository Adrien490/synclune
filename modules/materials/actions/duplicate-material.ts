"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError, success, error, notFound, validateInput } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_MATERIAL_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getMaterialInvalidationTags } from "../constants/cache";
import { duplicateMaterialSchema } from "../schemas/materials.schemas";

/**
 * Server Action ADMIN pour dupliquer un materiau
 *
 * Cree une copie du materiau avec:
 * - Un nouveau nom (original + " (copie)" ou " (copie N)")
 * - Un nouveau slug genere automatiquement
 * - isActive a false (pour eviter activation accidentelle)
 */
export async function duplicateMaterial(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_MATERIAL_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validation des donnees
		const rawData = {
			materialId: formData.get("materialId") as string,
		};

		const validated = validateInput(duplicateMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const { materialId } = validated.data;

		// 3. Recuperer le materiau original
		const original = await prisma.material.findUnique({
			where: { id: materialId },
		});

		if (!original) {
			return notFound("Materiau");
		}

		// 4. Generer un nouveau nom unique
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
				return error("Impossible de generer un nom unique. Supprimez certaines copies.");
			}
		}

		// 5. Generer un slug unique
		const slug = await generateSlug(prisma, "material", newName);

		// 6. Creer la copie
		const duplicate = await prisma.material.create({
			data: {
				name: newName,
				slug,
				description: original.description,
				isActive: false, // Desactive par defaut
			},
		});

		// 7. Invalider le cache
		const tags = getMaterialInvalidationTags(duplicate.slug);
		tags.forEach((tag) => updateTag(tag));

		return success(`Materiau duplique: ${duplicate.name}`, { id: duplicate.id, name: duplicate.name });
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer le materiau");
	}
}
