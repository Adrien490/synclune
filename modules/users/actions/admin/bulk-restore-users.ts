"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { bulkRestoreUsersSchema } from "../../schemas/user-admin.schemas";

export async function bulkRestoreUsers(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification des droits admin
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Acces non autorise. Droits administrateur requis.",
			};
		}

		// 2. Extraire les IDs du FormData
		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];

		// Valider les donnees
		const validation = bulkRestoreUsersSchema.safeParse({ ids });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// 3. Filtrer les utilisateurs eligibles (supprimes ou suspendus)
		const eligibleUsers = await prisma.user.findMany({
			where: {
				id: { in: validatedData.ids },
				OR: [
					{ deletedAt: { not: null } },
					{ suspendedAt: { not: null } },
				],
			},
			select: { id: true },
		});

		if (eligibleUsers.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun utilisateur eligible pour la restauration.",
			};
		}

		const eligibleIds = eligibleUsers.map((u) => u.id);

		// 4. Restaurer les utilisateurs
		const result = await prisma.user.updateMany({
			where: { id: { in: eligibleIds } },
			data: {
				deletedAt: null,
				suspendedAt: null,
			},
		});

		// 5. Revalider la page
		revalidatePath("/admin/utilisateurs");

		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} utilisateur${result.count > 1 ? "s" : ""} restaure${result.count > 1 ? "s" : ""} avec succes.`,
		};
	} catch (error) {
		if (error instanceof Error) {
			return {
				status: ActionStatus.ERROR,
				message: error.message,
			};
		}

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la restauration des utilisateurs.",
		};
	}
}
