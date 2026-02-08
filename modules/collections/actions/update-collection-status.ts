"use server";

import { CollectionStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { updateCollectionStatusSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";
import { COLLECTION_STATUS_LABELS } from "../constants/collection.constants";

/**
 * Server Action pour changer le statut d'une collection
 * Compatible avec useActionState de React 19
 */
export async function updateCollectionStatus(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des donnees du FormData
		const rawData = {
			id: formData.get("id") as string,
			status: formData.get("status") as string,
		};

		// 3. Validation avec Zod
		const validated = validateInput(updateCollectionStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, status } = validated.data;

		// 4. Verifier que la collection existe
		const existingCollection = await prisma.collection.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				slug: true,
				status: true,
			},
		});

		if (!existingCollection) {
			return notFound("Collection");
		}

		// 5. Verifier si le statut a change
		if (existingCollection.status === status) {
			return success(`La collection est déjà ${COLLECTION_STATUS_LABELS[status].toLowerCase()}.`);
		}

		// 6. Mettre a jour le statut
		await prisma.collection.update({
			where: { id },
			data: { status },
		});

		// 7. Invalidate cache tags
		const collectionTags = getCollectionInvalidationTags(existingCollection.slug);
		collectionTags.forEach(tag => updateTag(tag));
		updateTag("navbar-menu");

		// 8. Messages de succes contextuels
		const statusMessages: Record<CollectionStatus, string> = {
			[CollectionStatus.DRAFT]: `"${existingCollection.name}" mise en brouillon`,
			[CollectionStatus.PUBLIC]: `"${existingCollection.name}" publiée`,
			[CollectionStatus.ARCHIVED]: `"${existingCollection.name}" archivée`,
		};

		return success(statusMessages[status], {
			collectionId: id,
			name: existingCollection.name,
			oldStatus: existingCollection.status,
			newStatus: status,
		});
	} catch (e) {
		return handleActionError(e, "Erreur lors de la mise à jour du statut");
	}
}
