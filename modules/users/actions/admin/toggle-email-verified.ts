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
import { toggleEmailVerifiedSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { USER_AUDIT_ACTIONS } from "../../constants/audit-actions";
import { getUserFullInvalidationTags } from "../../constants/cache";

/**
 * Admin override to flip a user's emailVerified flag.
 *
 * Use case: support workflow when a user cannot receive the verification email
 * (bounce, typo fixed post-signup via admin). Manually flipping is safer than
 * forcing re-registration.
 */
export async function toggleEmailVerified(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		// Vérification admin avant rate-limit
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateCheck) return rateCheck.error;

		const rawData = { id: safeFormGet(formData, "id") };
		const validation = validateInput(toggleEmailVerifiedSchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId } = validation.data;

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, emailVerified: true, deletedAt: true },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		if (user.deletedAt) {
			return error("Impossible de modifier un compte supprime.");
		}

		const newValue = !user.emailVerified;

		await prisma.user.update({
			where: { id: userId },
			data: { emailVerified: newValue },
		});

		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);
		for (const tag of getUserFullInvalidationTags(userId)) {
			updateTag(tag);
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: USER_AUDIT_ACTIONS.TOGGLE_EMAIL_VERIFIED,
			targetType: "user",
			targetId: userId,
			metadata: {
				userEmail: user.email,
				previous: user.emailVerified,
				new: newValue,
			},
		});

		const message = newValue
			? `Email de ${user.name ?? user.email} marque comme verifie.`
			: `Verification email retiree pour ${user.name ?? user.email}.`;

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification de la verification email");
	}
}
