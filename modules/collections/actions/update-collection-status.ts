"use server";

import { CollectionStatus } from "@/app/generated/prisma";
import { updateTag } from "next/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateCollectionStatusSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../constants/cache";
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
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé. Droits administrateur requis.",
			};
		}

		// 2. Extraction des donnees du FormData
		const rawData = {
			id: formData.get("id") as string,
			status: formData.get("status") as string,
		};

		// 3. Validation avec Zod
		const result = updateCollectionStatusSchema.safeParse(rawData);

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const { id, status } = result.data;

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
			return {
				status: ActionStatus.NOT_FOUND,
				message: "La collection n'existe pas.",
			};
		}

		// 5. Verifier si le statut a change
		if (existingCollection.status === status) {
			return {
				status: ActionStatus.SUCCESS,
				message: `La collection est déjà ${COLLECTION_STATUS_LABELS[status].toLowerCase()}.`,
			};
		}

		// 6. Mettre a jour le statut
		await prisma.collection.update({
			where: { id },
			data: { status },
		});

		// 7. Invalidate cache tags
		const collectionTags = getCollectionInvalidationTags(existingCollection.slug);
		collectionTags.forEach(tag => updateTag(tag));

		// 8. Messages de succes contextuels
		const statusMessages: Record<CollectionStatus, string> = {
			[CollectionStatus.DRAFT]: `"${existingCollection.name}" mise en brouillon`,
			[CollectionStatus.PUBLIC]: `"${existingCollection.name}" publiée`,
			[CollectionStatus.ARCHIVED]: `"${existingCollection.name}" archivée`,
		};

		return {
			status: ActionStatus.SUCCESS,
			message: statusMessages[status],
			data: {
				collectionId: id,
				name: existingCollection.name,
				oldStatus: existingCollection.status,
				newStatus: status,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors du changement de statut.",
		};
	}
}
