"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import { validateInput, success, notFound, handleActionError } from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { adminUserIdSchema } from "../../schemas/user-admin.schemas";
import { buildUserDataExport } from "../../services/build-user-data-export.service";

/**
 * Server Action ADMIN pour exporter les données d'un utilisateur (RGPD)
 *
 * Permet à un admin d'exporter toutes les données personnelles d'un utilisateur.
 * Conforme à l'article 20 du RGPD - Droit à la portabilité des données.
 */
export async function exportUserDataAdmin(userId: string): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.EXPORT_DATA);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification admin
		const adminCheck = await requireAdminWithUser();
		if ("error" in adminCheck) return adminCheck.error;
		const { user: adminUser } = adminCheck;

		// 2b. Validation du userId
		const validation = validateInput(adminUserIdSchema, { userId });
		if ("error" in validation) return validation.error;

		// 3. Build export data
		const exportData = await buildUserDataExport(userId);

		if (!exportData) {
			return notFound("Utilisateur");
		}

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "user.exportData",
			targetType: "user",
			targetId: userId,
			metadata: { userEmail: exportData.profile.email },
		});

		return success("Données exportées avec succès", exportData);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'export des données");
	}
}
