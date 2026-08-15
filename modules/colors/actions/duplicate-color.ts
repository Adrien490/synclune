"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { generateUniqueReadableName } from "@/shared/services/unique-name-generator.service";
import type { ActionState } from "@/shared/types/server-action";

import { getColorInvalidationTags } from "../constants/cache";
import { duplicateColorSchema } from "../schemas/color.schemas";

/**
 * Admin server action to duplicate a color.
 *
 * Creates a copy with a new name (original + " (copie)" or " (copie N)").
 */
export async function duplicateColor(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin authorization check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 3. Validate data
		const rawData = {
			colorId: safeFormGet(formData, "colorId"),
		};

		const validated = validateInput(duplicateColorSchema, rawData);
		if ("error" in validated) return validated.error;
		const { colorId } = validated.data;

		// 4. Fetch original color
		const original = await prisma.color.findUnique({
			where: { id: colorId },
		});

		if (!original) {
			return notFound("Couleur", "f");
		}

		// 5. Generate a unique name via the service
		const nameResult = await generateUniqueReadableName(original.name, async (name) => {
			const existing = await prisma.color.findFirst({ where: { name } });
			return existing !== null;
		});

		if (!nameResult.success) {
			return error(nameResult.error ?? "Impossible de générer un nom unique");
		}

		const newName = nameResult.name!;

		// 6. Create the copy
		const duplicate = await prisma.color.create({
			data: {
				name: newName,
				hex: original.hex,
			},
		});

		// 7. Invalidate cache
		const tags = getColorInvalidationTags(duplicate.id);
		tags.forEach((tag) => updateTag(tag));

		return success(`Couleur dupliquee: ${duplicate.name}`, {
			id: duplicate.id,
			name: duplicate.name,
		});
	} catch (e) {
		return handleActionError(e, "Impossible de dupliquer la couleur");
	}
}
