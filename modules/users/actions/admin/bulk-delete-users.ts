"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { bulkDeleteUsersSchema } from "../../schemas/user-admin.schemas";

export async function bulkDeleteUsers(
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
		const validation = bulkDeleteUsersSchema.safeParse({ ids });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// 3. Verifier qu'on ne supprime pas son propre compte
		const currentUser = await getCurrentUser();
		if (currentUser && validatedData.ids.includes(currentUser.id)) {
			return {
				status: ActionStatus.ERROR,
				message: "Vous ne pouvez pas supprimer votre propre compte.",
			};
		}

		// 4. Filtrer les utilisateurs eligibles (non deja supprimes)
		const eligibleUsers = await prisma.user.findMany({
			where: {
				id: { in: validatedData.ids },
				deletedAt: null,
			},
			select: { id: true },
		});

		if (eligibleUsers.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun utilisateur eligible pour la suppression.",
			};
		}

		const eligibleIds = eligibleUsers.map((u) => u.id);

		// 5. Soft delete
		const result = await prisma.user.updateMany({
			where: { id: { in: eligibleIds } },
			data: { deletedAt: new Date() },
		});

		// 6. Revalider la page
		revalidatePath("/admin/utilisateurs");

		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} utilisateur${result.count > 1 ? "s" : ""} supprime${result.count > 1 ? "s" : ""} avec succes.`,
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
			message: "Une erreur est survenue lors de la suppression des utilisateurs.",
		};
	}
}
