"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	validateInput,
	success,
	error,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { getUserProvidersInvalidationTags } from "@/modules/auth/utils/cache.utils";
import { unlinkOAuthAccountSchema } from "../schemas/user-admin.schemas";
import { USERS_CACHE_TAGS } from "../constants/cache";

/**
 * User self-service: unlink an OAuth provider from the account.
 *
 * Guards that at least one authentication method (credential or another OAuth)
 * remains after the unlink, otherwise the user would be locked out.
 */
export async function unlinkOAuthAccount(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(USER_LIMITS.UNLINK_OAUTH);
		if ("error" in rateCheck) return rateCheck.error;

		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;
		const userId = userAuth.user.id;

		const rawData = { providerId: safeFormGet(formData, "providerId") };
		const validation = validateInput(unlinkOAuthAccountSchema, rawData);
		if ("error" in validation) return validation.error;

		const { providerId } = validation.data;

		if (providerId === "credential") {
			return error("Impossible de dissocier l'authentification par mot de passe depuis cet ecran.");
		}

		const accounts = await prisma.account.findMany({
			where: { userId },
			select: { id: true, providerId: true },
		});

		const target = accounts.find((a) => a.providerId === providerId);
		if (!target) {
			return error("Aucun compte lie trouve pour ce fournisseur.");
		}

		// Ensure at least one auth method remains after unlink
		const remainingAfter = accounts.length - 1;
		if (remainingAfter < 1) {
			return error(
				"Impossible de dissocier: c'est votre seule methode d'authentification. Definissez un mot de passe d'abord.",
			);
		}

		await prisma.account.delete({ where: { id: target.id } });

		updateTag(USERS_CACHE_TAGS.CURRENT_USER(userId));
		updateTag(USERS_CACHE_TAGS.ACCOUNTS(userId));
		updateTag(USERS_CACHE_TAGS.ACCOUNTS_LIST);
		// La liste des providers OAuth est cachée sous son propre tag (module auth)
		for (const tag of getUserProvidersInvalidationTags(userId)) {
			updateTag(tag);
		}

		const providerLabel = providerId === "google" ? "Google" : providerId;
		return success(`Compte ${providerLabel} dissocie avec succes.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la dissociation du compte");
	}
}
