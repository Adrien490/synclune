"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { bulkArchiveCollectionsSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour archiver ou desarchiver plusieurs collections en masse
 * Compatible avec useActionState de React 19
 */
export async function bulkArchiveCollections(
	_: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		// 2. Extraction des donnees du FormData
		const collectionIdsRaw = formData.get("collectionIds") as string;
		const targetStatus = (formData.get("targetStatus") as string) || "ARCHIVED";

		// Parse le JSON des IDs
		let collectionIds: string[];
		try {
			collectionIds = JSON.parse(collectionIdsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs de collections invalide.",
			};
		}

		// 3. Validation avec Zod
		const result = bulkArchiveCollectionsSchema.safeParse({
			collectionIds,
			targetStatus,
		});

		if (!result.success) {
			const firstError = result.error.issues[0];
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: firstError.message,
			};
		}

		const validatedData = result.data;

		// 4. Verifier que toutes les collections existent
		const existingCollections = await prisma.collection.findMany({
			where: {
				id: {
					in: validatedData.collectionIds,
				},
			},
			select: {
				id: true,
				name: true,
				slug: true,
				status: true,
			},
		});

		if (existingCollections.length !== validatedData.collectionIds.length) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Une ou plusieurs collections n'existent pas.",
			};
		}

		// 5. Mettre a jour le statut
		await prisma.collection.updateMany({
			where: {
				id: {
					in: validatedData.collectionIds,
				},
			},
			data: {
				status: validatedData.targetStatus,
			},
		});

		// 6. Invalidate cache tags pour toutes les collections
		for (const collection of existingCollections) {
			const collectionTags = getCollectionInvalidationTags(collection.slug);
			collectionTags.forEach((tag) => updateTag(tag));
		}

		// 7. Message de succes
		const count = existingCollections.length;
		const actionLabel =
			validatedData.targetStatus === "ARCHIVED" ? "archivée" : "restaurée";
		const successMessage = `${count} collection${count > 1 ? "s" : ""} ${actionLabel}${count > 1 ? "s" : ""} avec succès`;

		return {
			status: ActionStatus.SUCCESS,
			message: successMessage,
			data: {
				collectionIds: validatedData.collectionIds,
				count,
				targetStatus: validatedData.targetStatus,
				collections: existingCollections.map((c) => ({
					id: c.id,
					name: c.name,
					slug: c.slug,
				})),
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de l'archivage en masse.",
		};
	}
}
