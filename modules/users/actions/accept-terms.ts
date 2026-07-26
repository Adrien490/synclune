"use server";

import { updateTag } from "next/cache";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { LEGAL_TERMS_VERSION } from "@/shared/constants/legal-versions";
import { success, handleActionError } from "@/shared/lib/actions";
import { prisma } from "@/shared/lib/prisma";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";
import { USERS_CACHE_TAGS } from "../constants/cache";

/**
 * Server Action : acceptation des CGV + politique de confidentialité.
 *
 * RGPD-AUDIT P1-3 : les comptes créés via OAuth (Google) n'ont jamais accepté
 * les CGV — `termsAcceptedAt` n'était posé que par le flow email/password.
 * Le bandeau `AcceptTermsBanner` (espace compte, affiché si `termsAcceptedAt`
 * est NULL) soumet cette action pour tracer le consentement (Art. 7 RGPD :
 * timestamp + version du document).
 *
 * Idempotente : re-soumettre rafraîchit simplement la date et aligne la version.
 */
export async function acceptTerms(_prevState: ActionState | undefined): Promise<ActionState> {
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(USER_LIMITS.UPDATE_PROFILE);
		if ("error" in rateCheck) return rateCheck.error;

		const auth = await requireAuth();
		if ("error" in auth) return auth.error;

		const userId = auth.user.id;

		await prisma.user.update({
			where: { id: userId },
			data: { termsAcceptedAt: new Date(), termsVersion: LEGAL_TERMS_VERSION },
		});

		updateTag(USERS_CACHE_TAGS.CURRENT_USER(userId));

		return success("Merci ! Votre acceptation a bien été enregistrée.");
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'enregistrement de votre acceptation");
	}
}
