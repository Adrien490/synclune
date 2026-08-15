"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { updateCollectionStatusSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour activer/désactiver une collection — schéma lean (lot 2) :
 * le statut est un booléen `active`, plus un enum de publication.
 * Compatible avec useActionState de React 19.
 */
export async function updateCollectionStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		// 1. Admin auth check
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;

		// 2. Extract data from FormData
		const rawData = {
			id: safeFormGet(formData, "id"),
			active: safeFormGet(formData, "active"),
		};

		// 3. Validation avec Zod
		const validated = validateInput(updateCollectionStatusSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, active } = validated.data;

		// 4. Transaction atomique : lire + muter
		const existingCollection = await prisma.$transaction(async (tx) => {
			const collection = await tx.collection.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					slug: true,
					active: true,
				},
			});

			if (!collection) {
				throw new Error("NOT_FOUND");
			}

			if (collection.active === active) {
				return { ...collection, skipped: true as const };
			}

			await tx.collection.update({
				where: { id },
				data: { active },
			});

			return { ...collection, skipped: false as const };
		});

		// 5. Si statut deja applique, retourner immediatement sans invalidation
		if (existingCollection.skipped) {
			return success(`La collection est déjà ${active ? "publiée" : "en brouillon"}.`);
		}

		// 6. Invalidate cache tags
		const collectionTags = getCollectionInvalidationTags(existingCollection.slug);
		collectionTags.forEach((tag) => updateTag(tag));

		return success(
			active
				? `"${existingCollection.name}" publiée`
				: `"${existingCollection.name}" mise en brouillon`,
			{
				collectionId: id,
				name: existingCollection.name,
				oldActive: existingCollection.active,
				newActive: active,
			},
		);
	} catch (e) {
		if (e instanceof Error && e.message === "NOT_FOUND") {
			return notFound("Collection", "f");
		}
		return handleActionError(e, "Erreur lors de la mise à jour du statut");
	}
}
