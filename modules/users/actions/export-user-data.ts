"use server";

import type { ActionState } from "@/shared/types/server-action";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { success, notFound, handleActionError } from "@/shared/lib/actions";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { buildUserDataExport } from "../services/build-user-data-export.service";

// Re-export pour retrocompatibilite
export type { UserDataExport } from "../types/rgpd.types";

/**
 * Server Action pour exporter les données utilisateur (droit à la portabilité RGPD)
 *
 * Exporte toutes les données personnelles de l'utilisateur dans un format structuré (JSON).
 * Conforme à l'article 20 du RGPD - Droit à la portabilité des données.
 */
export async function exportUserData(): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(USER_LIMITS.EXPORT_DATA);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification de l'authentification
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		// 3. Build export data
		const exportData = await buildUserDataExport(userAuth.user.id);

		if (!exportData) {
			return notFound("Utilisateur");
		}

		return success("Données exportées avec succès", exportData);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'export des données");
	}
}
