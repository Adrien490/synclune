"use server";

import { AccountStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { success, error, handleActionError } from "@/shared/lib/actions";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS } from "../constants/cache";

/**
 * Server Action to cancel a pending account deletion request.
 *
 * Restores the account to ACTIVE status and clears the deletion timestamp.
 */
export async function cancelAccountDeletion(
	_prevState: ActionState | undefined,
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(USER_LIMITS.CANCEL_DELETION);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Auth
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		const userId = userAuth.user.id;

		// 3. Verify account is pending deletion
		const currentUser = await prisma.user.findUnique({
			where: { id: userId },
			select: { accountStatus: true },
		});

		if (currentUser?.accountStatus !== AccountStatus.PENDING_DELETION) {
			return error("Aucune demande de suppression en cours pour votre compte.");
		}

		// 4. Restore account
		await prisma.user.update({
			where: { id: userId },
			data: {
				accountStatus: AccountStatus.ACTIVE,
				deletionRequestedAt: null,
			},
		});

		// 5. Invalidate cache
		updateTag(USERS_CACHE_TAGS.CURRENT_USER(userId));
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);

		return success(
			"La suppression de votre compte a été annulée. Votre compte est de nouveau actif.",
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'annulation de la suppression");
	}
}
