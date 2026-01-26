"use server";

import { updateTag, revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { generateSlug } from "@/shared/utils/generate-slug";
import { sanitizeText } from "@/shared/lib/sanitize";

import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { createCollectionSchema } from "../schemas/collection.schemas";

export async function createCollection(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraire et valider les donnees
		const validation = createCollectionSchema.safeParse({
			name: formData.get("name"),
			description: formData.get("description") || null,
			status: formData.get("status") || undefined,
		});

		if (!validation.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: validation.error.issues[0]?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// Sanitize text inputs
		const sanitizedName = sanitizeText(validatedData.name);
		const sanitizedDescription = validatedData.description
			? sanitizeText(validatedData.description)
			: null;

		// Verifier l'unicite du nom
		const existingName = await prisma.collection.findFirst({
			where: { name: sanitizedName },
		});

		if (existingName) {
			return {
				status: ActionStatus.ERROR,
				message:
					"Ce nom de collection existe deja. Veuillez en choisir un autre.",
			};
		}

		// Generer un slug unique automatiquement
		const slug = await generateSlug(prisma, "collection", sanitizedName);

		// Creer la collection
		await prisma.collection.create({
			data: {
				name: sanitizedName,
				slug,
				description: sanitizedDescription,
				status: validatedData.status,
			},
		});

		// Revalider les pages concernees et invalider le cache
		revalidatePath("/admin/catalogue/collections");
		getCollectionInvalidationTags(slug).forEach(tag => updateTag(tag));
		updateTag("navbar-menu");

		return {
			status: ActionStatus.SUCCESS,
			message: "Collection créée avec succès",
			data: {
				collectionStatus: validatedData.status,
			},
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors de la creation de la collection");
	}
}
