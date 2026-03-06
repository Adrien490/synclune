"use server";

import { headers } from "next/headers";
import { auth } from "@/modules/auth/lib/auth";
import type { ActionState } from "@/shared/types/server-action";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { validateInput, success, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { changeEmailSchema } from "../schemas/user.schemas";

export async function requestEmailChange(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		const rateCheck = await enforceRateLimitForCurrentUser(USER_LIMITS.CHANGE_EMAIL);
		if ("error" in rateCheck) return rateCheck.error;

		const rawData = {
			newEmail: safeFormGet(formData, "newEmail"),
		};

		const validation = validateInput(changeEmailSchema, rawData);
		if ("error" in validation) return validation.error;

		await auth.api.changeEmail({
			body: { newEmail: validation.data.newEmail, callbackURL: "/parametres" },
			headers: await headers(),
		});

		return success("Un email de confirmation a été envoyé à votre nouvelle adresse");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la demande de changement d'email");
	}
}
