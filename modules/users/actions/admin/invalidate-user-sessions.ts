"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAdmin } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

/**
 * Server Action ADMIN pour forcer la déconnexion d'un utilisateur
 *
 * Supprime toutes les sessions actives de l'utilisateur,
 * le forçant à se reconnecter.
 */
export async function invalidateUserSessions(userId: string): Promise<ActionState> {
	try {
		// 1. Vérification admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 2. Vérifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true, name: true },
		});

		if (!user) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Utilisateur non trouvé",
			};
		}

		// 3. Supprimer toutes les sessions de l'utilisateur
		const result = await prisma.session.deleteMany({
			where: { userId },
		});

		// 4. Revalider la page utilisateurs
		revalidatePath("/admin/utilisateurs");

		const displayName = user.name || user.email;
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} session(s) de ${displayName} invalidée(s)`,
			data: { deletedCount: result.count },
		};
	} catch (error) {
		console.error("[INVALIDATE_USER_SESSIONS] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de l'invalidation des sessions",
		};
	}
}
