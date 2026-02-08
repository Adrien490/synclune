"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import {
	validateInput,
	handleActionError,
	success,
	validationError,
} from "@/shared/lib/actions";

import { bulkDeleteStockNotificationsSchema } from "../schemas/stock-notification.schemas";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Server Action ADMIN pour soft-delete plusieurs notifications (RGPD - retention 10 ans)
 */
export async function bulkDeleteStockNotifications(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const idsRaw = formData.get("ids") as string;
		let ids: string[];

		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return validationError("Format des IDs invalide");
		}

		const validated = validateInput(bulkDeleteStockNotificationsSchema, { ids });
		if ("error" in validated) return validated.error;

		// Soft delete en masse (retention 10 ans - Art. L123-22 Code de Commerce)
		const deleteResult = await prisma.stockNotificationRequest.updateMany({
			where: {
				id: { in: validated.data.ids },
				deletedAt: null, // Ne pas re-supprimer les déjà supprimés
			},
			data: { deletedAt: new Date() },
		});

		// Invalider le cache
		const tagsToInvalidate = [
			STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST,
			SHARED_CACHE_TAGS.ADMIN_BADGES,
		];
		tagsToInvalidate.forEach((tag) => updateTag(tag));

		return success(
			`${deleteResult.count} notification${deleteResult.count > 1 ? "s" : ""} supprimée${deleteResult.count > 1 ? "s" : ""} définitivement`
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}
