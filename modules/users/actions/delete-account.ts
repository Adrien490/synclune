"use server";

import { AccountStatus, OrderStatus, RefundStatus, Role } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { auth } from "@/modules/auth/lib/auth";
import { cookies, headers } from "next/headers";
import { updateTag } from "next/cache";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	success,
	error,
	validateInput,
	handleActionError,
	BusinessError,
} from "@/shared/lib/actions";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { deleteAccountSchema } from "../schemas/user.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USERS_CACHE_TAGS } from "../constants/cache";
import { RECENT_SEARCHES_COOKIE_NAME } from "@/modules/products/constants/recent-searches";

/**
 * Server Action to request deferred account deletion (GDPR right to erasure)
 *
 * Sets the account to PENDING_DELETION status with a 30-day grace period.
 * The actual anonymization is handled by the `process-account-deletions` cron job.
 * Users can cancel the deletion during the grace period.
 */
export async function deleteAccount(
	_prevState: ActionState | undefined,
	formData: FormData,
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
			return error("Une demande de suppression est déjà en cours pour votre compte.");
		}

		// 5. Check no pending orders or in-flight refunds
		const [pendingOrders, pendingRefunds] = await Promise.all([
			prisma.order.count({
				where: {
					userId,
					status: {
						in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED],
					},
				},
			}),
			prisma.refund.count({
				where: {
					order: { userId },
					status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
				},
			}),
		]);

		if (pendingOrders > 0) {
			return error(
				`Vous avez ${pendingOrders} commande(s) en cours. Veuillez attendre leur livraison avant de supprimer votre compte.`,
			);
		}

		if (pendingRefunds > 0) {
			return error(
				`Vous avez ${pendingRefunds} remboursement(s) en cours. Veuillez attendre leur traitement avant de supprimer votre compte.`,
			);
		}

		// 6. Atomically: refuse if last admin + mark PENDING_DELETION + revoke ALL sessions
		// (RGPD Art. 17 — la suppression doit "fermer le robinet" immédiatement sur TOUS
		// les devices, pas seulement celui qui émet la requête).
		await prisma.$transaction(
			async (tx) => {
				if (user.role === Role.ADMIN) {
					const otherAdmins = await tx.user.count({
						where: { role: Role.ADMIN, ...notDeleted, id: { not: userId } },
					});
					if (otherAdmins < 1) {
						throw new BusinessError(
							"Impossible de supprimer votre compte : vous êtes le dernier administrateur. Promouvez un autre utilisateur avant de demander la suppression.",
							"LAST_ADMIN",
						);
					}
				}

				await tx.user.update({
					where: { id: userId },
					data: {
						accountStatus: AccountStatus.PENDING_DELETION,
						deletionRequestedAt: new Date(),
					},
				});

				await tx.session.deleteMany({ where: { userId } });
			},
			{ isolationLevel: "Serializable" },
		);

		// 7. Sign out (clear cookie on current device — sessions on other devices
		// already purged by the transaction above)
		const headersList = await headers();
		await auth.api.signOut({
			headers: headersList,
		});

		// 8. RGPD: purge device-local search history cookie
		const cookieStore = await cookies();
		cookieStore.delete(RECENT_SEARCHES_COOKIE_NAME);

		// 9. Invalidate cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(USERS_CACHE_TAGS.CURRENT_USER(userId));

		return success(
			"Votre demande de suppression a été enregistrée. Votre compte sera définitivement supprimé dans 30 jours. Vous pouvez annuler cette demande en vous reconnectant.",
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la demande de suppression du compte");
	}
}
