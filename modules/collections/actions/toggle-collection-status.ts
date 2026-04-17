"use server";

import { CollectionStatus } from "@/app/generated/prisma/client";
import { updateTag } from "next/cache";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_COLLECTION_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";

import { toggleCollectionStatusSchema } from "../schemas/collection.schemas";
import { getCollectionInvalidationTags } from "../utils/cache.utils";

/**
 * Server Action pour basculer rapidement le statut d'une collection
 * DRAFT <-> PUBLIC (toggle)
 * ARCHIVED -> PUBLIC (restauration)
 * Si targetStatus est fourni, l'utilise directement (DRAFT ou PUBLIC)
 */
export async function toggleCollectionStatus(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_COLLECTION_LIMITS.TOGGLE_STATUS);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(toggleCollectionStatusSchema, {
			id: safeFormGet(formData, "id"),
			currentStatus: safeFormGet(formData, "currentStatus"),
			targetStatus: safeFormGet(formData, "targetStatus") ?? undefined,
		});
		if ("error" in validated) return validated.error;

		const { id, currentStatus, targetStatus } = validated.data;

		const newStatus: CollectionStatus =
			targetStatus ??
			(currentStatus === CollectionStatus.PUBLIC
				? CollectionStatus.DRAFT
				: CollectionStatus.PUBLIC);

		const updated = await prisma.$transaction(async (tx) => {
			const existing = await tx.collection.findUnique({
				where: { id },
				select: {
					id: true,
					name: true,
					slug: true,
					status: true,
				},
			});

			if (!existing) {
				throw new Error("NOT_FOUND");
			}

			if (existing.status === newStatus) {
				return { ...existing, skipped: true as const };
			}

			await tx.collection.update({
				where: { id },
				data: { status: newStatus },
			});

			return { ...existing, skipped: false as const };
		});

		getCollectionInvalidationTags(updated.slug).forEach((tag) => updateTag(tag));
		updateTag(SHARED_CACHE_TAGS.NAVBAR_MENU);

		const messages: Record<CollectionStatus, string> = {
			[CollectionStatus.DRAFT]: `"${updated.name}" mise en brouillon`,
			[CollectionStatus.PUBLIC]: `"${updated.name}" publiée`,
			[CollectionStatus.ARCHIVED]: `"${updated.name}" archivée`,
		};

		if (updated.skipped) {
			return success(messages[newStatus], {
				collectionId: id,
				name: updated.name,
				oldStatus: updated.status,
				newStatus,
			});
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "collection.toggleStatus",
			targetType: "collection",
			targetId: id,
			metadata: { name: updated.name, oldStatus: updated.status, newStatus },
		});

		return success(messages[newStatus], {
			collectionId: id,
			name: updated.name,
			oldStatus: updated.status,
			newStatus,
		});
	} catch (e) {
		if (e instanceof Error && e.message === "NOT_FOUND") {
			return notFound("Collection");
		}
		return handleActionError(e, "Une erreur est survenue lors du changement de statut");
	}
}
