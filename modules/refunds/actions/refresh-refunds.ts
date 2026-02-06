"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";

import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

export async function refreshRefunds(
	_prevState: unknown,
	_formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return {
			status: ActionStatus.SUCCESS,
			message: "Remboursements rafraîchis",
		};
	} catch (error) {
		return handleActionError(error, "Une erreur est survenue lors du rafraîchissement");
	}
}
