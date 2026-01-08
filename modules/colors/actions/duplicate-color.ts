"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { generateUniqueReadableName } from "@/shared/services/unique-name-generator.service";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";

import { getColorInvalidationTags } from "../constants/cache";
import { duplicateColorSchema } from "../schemas/color.schemas";

/**
 * Server Action ADMIN pour dupliquer une couleur
 *
 * Cree une copie de la couleur avec:
 * - Un nouveau nom (original + " (copie)" ou " (copie N)")
 * - Un nouveau slug genere automatiquement
 * - isActive a false (pour eviter activation accidentelle)
 */
export async function duplicateColor(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Validation des donnees
		const rawData = {
			colorId: formData.get("colorId") as string,
		};

		const result = duplicateColorSchema.safeParse(rawData);
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Donnees invalides",
			};
		}

		const { colorId } = result.data;

		// 3. Recuperer la couleur originale
		const original = await prisma.color.findUnique({
			where: { id: colorId },
		});

		if (!original) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Couleur non trouvee",
			};
		}

		// 4. Generer un nouveau nom unique via le service
		const nameResult = await generateUniqueReadableName(
			original.name,
			async (name) => {
				const existing = await prisma.color.findFirst({ where: { name } });
				return existing !== null;
			}
		);

		if (!nameResult.success) {
			return {
				status: ActionStatus.ERROR,
				message: nameResult.error ?? "Impossible de générer un nom unique",
			};
		}

		const newName = nameResult.name!;

		// 5. Generer un slug unique
		const slug = await generateSlug(prisma, "color", newName);

		// 6. Creer la copie
		const duplicate = await prisma.color.create({
			data: {
				name: newName,
				slug,
				hex: original.hex,
				isActive: false, // Desactive par defaut
			},
		});

		// 7. Revalider
		revalidatePath("/admin/catalogue/couleurs");
		const tags = getColorInvalidationTags();
		tags.forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Couleur dupliquee: ${duplicate.name}`,
			data: { id: duplicate.id, name: duplicate.name },
		};
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer la couleur");
	}
}
