"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	success,
	error,
	notFound,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { anonymizeUserImmediatelySchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USER_AUDIT_ACTIONS } from "../../constants/audit-actions";
import { USERS_CACHE_TAGS, getUserFullInvalidationTags } from "../../constants/cache";
import { anonymizeUserInTransaction } from "../../services/anonymize-user.service";

/**
 * Admin GDPR Art. 17 override: anonymize a user immediately, bypassing the 30-day grace period.
 *
 * Use case: legal/CNIL/DPO request for immediate erasure. The user-facing flow always goes
 * through a 30-day grace period (reversible), but admins must be able to fulfil erasure
 * "without undue delay" when a legal basis requires it.
 *
 * Requires double confirmation (`confirmation` must match `ANONYMISER {email}`)
 * and a textual reason (audit trail).
 */
export async function anonymizeUserImmediately(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// Verification des droits admin avant rate-limit (anti-leak 429 vs 403)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.ANONYMIZE_NOW);
		if ("error" in rateCheck) return rateCheck.error;

		const rawData = {
			id: safeFormGet(formData, "id"),
			confirmation: safeFormGet(formData, "confirmation"),
			reason: safeFormGet(formData, "reason"),
		};

		const validation = validateInput(anonymizeUserImmediatelySchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId, confirmation, reason } = validation.data;

		if (userId === adminUser.id) {
			return error("Vous ne pouvez pas anonymiser votre propre compte par ce biais.");
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true, name: true, accountStatus: true },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		// Strict double confirmation: must equal "ANONYMISER {email}" (case-sensitive).
		const expectedConfirmation = `ANONYMISER ${user.email}`;
		if (confirmation !== expectedConfirmation) {
			return error(`Confirmation invalide. Saisissez exactement : ${expectedConfirmation}`);
		}

		if (user.accountStatus === "ANONYMIZED") {
			return error("Cet utilisateur est deja anonymise.");
		}

		await prisma.$transaction(async (tx) => {
			await anonymizeUserInTransaction(tx, userId, { allowImmediate: true });
		});

		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		updateTag(USERS_CACHE_TAGS.ACCOUNTS_LIST);
		for (const tag of getUserFullInvalidationTags(userId)) {
			updateTag(tag);
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: USER_AUDIT_ACTIONS.ANONYMIZE_IMMEDIATELY,
			targetType: "user",
			targetId: userId,
			metadata: {
				previousStatus: user.accountStatus,
				userEmail: user.email,
				reason,
			},
		});

		return success(`Utilisateur anonymise immediatement (GDPR Art. 17).`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'anonymisation immediate");
	}
}
