"use server";

import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	validateFormData,
	handleActionError,
} from "@/shared/lib/actions";
import { forbidden, success } from "@/shared/lib/actions/responses";
import { sendAdminContactEmail } from "@/modules/emails/services/admin-emails";
import type { ActionState } from "@/shared/types/server-action";
import { contactAdrienSchema } from "../schemas/dashboard.schemas";

/**
 * Server Action pour envoyer un email à Adrien (créateur du site)
 * Utilise React Email pour le template
 *
 * Protection:
 * - Nécessite un compte authentifié avec rôle ADMIN
 * - Rate limit: 5 emails par heure
 */
export async function contactAdrien(
	_previousState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting - 5 emails par heure
		const rateCheck = await enforceRateLimitForCurrentUser({
			limit: 5,
			windowMs: 60 * 60 * 1000, // 1 heure
		});
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérifier l'authentification
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;

		const { user } = auth;

		// 3. Vérifier le rôle admin
		if (user.role !== "ADMIN") {
			return forbidden(
				"Vous n'avez pas les permissions pour effectuer cette action"
			);
		}

		// 4. Extraction et validation des données
		const validated = validateFormData(
			formData,
			(fd) => ({
				message: fd.get("message"),
			}),
			contactAdrienSchema
		);

		if ("error" in validated) return validated.error;

		const { message } = validated.data;

		// 5. Envoyer l'email avec React Email
		const result = await sendAdminContactEmail({
			senderName: user.name || "Administrateur",
			senderEmail: user.email || "",
			message,
		});

		if (!result.success) {
			return handleActionError(
				result.error,
				"Une erreur est survenue lors de l'envoi du message"
			);
		}

		return success("Message envoyé avec succès", {
			messageId: result.data?.id,
		});
	} catch (error) {
		return handleActionError(
			error,
			"Une erreur est survenue lors de l'envoi du message"
		);
	}
}
