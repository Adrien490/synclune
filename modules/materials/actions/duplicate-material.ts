"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	handleActionError,
	success,
	error,
	notFound,
	validateInput,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { generateUniqueReadableName } from "@/shared/services/unique-name-generator.service";

import { getMaterialInvalidationTags } from "../constants/cache";
import { duplicateMaterialSchema } from "../schemas/materials.schemas";

/**
 * Server Action ADMIN pour dupliquer un materiau
 *
 * Cree une copie du materiau avec:
 * - Un nouveau nom (original + " (copie)" ou " (copie N)")
 * - Un nouveau slug genere automatiquement
 * - active a false (pour eviter activation accidentelle)
 */
export async function duplicateMaterial(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Verification admin
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 3. Validation des donnees
		const rawData = {
			materialId: safeFormGet(formData, "materialId"),
		};

		const validated = validateInput(duplicateMaterialSchema, rawData);
		if ("error" in validated) return validated.error;
		const { materialId } = validated.data;

		// 4. Recuperer le materiau original
		const original = await prisma.material.findUnique({
			where: { id: materialId },
		});

		if (!original) {
			return notFound("Matériau");
		}

		// 5. Generer un nouveau nom unique via la SSOT (parité couleurs/types —
		// l'implémentation locale faisait un `startsWith` sensible à la casse).
		const nameResult = await generateUniqueReadableName(original.name, async (name) => {
			const existing = await prisma.material.findFirst({ where: { name } });
			return existing !== null;
		});

		if (!nameResult.success) {
			return error(nameResult.error ?? "Impossible de générer un nom unique");
		}

		const newName = nameResult.name!;

		// 6. Creer la copie
		const duplicate = await prisma.material.create({
			data: {
				name: newName,
			},
		});

		// 7. Invalider le cache
		const tags = getMaterialInvalidationTags(duplicate.id);
		tags.forEach((tag) => updateTag(tag));

		return success(`Matériau dupliqué : ${duplicate.name}`, {
			id: duplicate.id,
			name: duplicate.name,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer le matériau");
	}
}
