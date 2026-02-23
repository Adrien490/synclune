"use server";

import { AccountStatus, OrderStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { auth } from "@/modules/auth/lib/auth";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	success,
	error,
	validateInput,
	handleActionError,
} from "@/shared/lib/actions";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { deleteAccountSchema } from "../schemas/user.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS } from "../constants/cache";

/**
 * Server Action to request deferred account deletion (GDPR right to erasure)
 *
 * Sets the account to PENDING_DELETION status with a 30-day grace period.
 * The actual anonymization is handled by the `process-account-deletions` cron job.
 * Users can cancel the deletion during the grace period.
 */
export async function deleteAccount(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(USER_LIMITS.DELETE_ACCOUNT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Auth
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		// 3. Validate confirmation text
		const validation = validateInput(deleteAccountSchema, {
			confirmation: formData.get("confirmation"),
		});
		if ("error" in validation) return validation.error;

		const user = userAuth.user;
		const userId = user.id;

		// 4. Idempotence guard: already pending deletion
		const currentUser = await prisma.user.findUnique({
			where: { id: userId },
			select: { accountStatus: true },
		});

		if (currentUser?.accountStatus === AccountStatus.PENDING_DELETION) {
			return error(
				"Une demande de suppression est déjà en cours pour votre compte."
			);
		}

		// 5. Check no pending orders
		const pendingOrders = await prisma.order.count({
			where: {
				userId,
				status: {
					in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED],
				},
			},
		});

		if (pendingOrders > 0) {
			return error(
				`Vous avez ${pendingOrders} commande(s) en cours. Veuillez attendre leur livraison avant de supprimer votre compte.`
			);
		}

		// 6. Set account to PENDING_DELETION
		await prisma.user.update({
			where: { id: userId },
			data: {
				accountStatus: AccountStatus.PENDING_DELETION,
				deletionRequestedAt: new Date(),
			},
		});

		// 7. Sign out (invalidate session)
		const headersList = await headers();
		await auth.api.signOut({
			headers: headersList,
		});

		// 8. Invalidate cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(USERS_CACHE_TAGS.CURRENT_USER(userId));

		return success(
			"Votre demande de suppression a été enregistrée. Votre compte sera définitivement supprimé dans 30 jours. Vous pouvez annuler cette demande en vous reconnectant."
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la demande de suppression du compte");
	}
}
