"use server";

import { updateTag } from "next/cache";
import { isAdmin } from "@/modules/auth/utils/guards";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { ORDERS_CACHE_TAGS } from "../constants/cache";
import { DASHBOARD_CACHE_TAGS } from "@/modules/dashboard/constants/cache";

export async function refreshOrders(
	_prevState: unknown,
	_formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé. Droits administrateur requis.",
			};
		}

		updateTag(ORDERS_CACHE_TAGS.LIST);
		updateTag(ORDERS_CACHE_TAGS.CUSTOMERS_LIST);
		updateTag(DASHBOARD_CACHE_TAGS.BADGES);

		return {
			status: ActionStatus.SUCCESS,
			message: "Commandes rafraîchies",
		};
	} catch (error) {
		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors du rafraîchissement",
		};
	}
}
