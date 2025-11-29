"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { getCurrentUser } from "@/modules/auth/utils/session";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { deleteUserSchema } from "../../schemas/user-admin.schemas";

export async function deleteUser(
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

		// 2. Extraire l'ID du FormData
		const id = formData.get("id") as string;

		// Valider les donnees
		const validation = deleteUserSchema.safeParse({ id });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const { id: userId } = validation.data;

		// 3. Verifier qu'on ne supprime pas son propre compte
		const currentUser = await getCurrentUser();
		if (currentUser?.id === userId) {
			return {
				status: ActionStatus.ERROR,
				message: "Vous ne pouvez pas supprimer votre propre compte.",
			};
		}

		// 4. Verifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, deletedAt: true },
		});

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: "Utilisateur introuvable.",
			};
		}

		if (user.deletedAt) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet utilisateur est deja supprime.",
			};
		}

		// 5. Soft delete
		await prisma.user.update({
			where: { id: userId },
			data: { deletedAt: new Date() },
		});

		// 6. Revalider la page
		revalidatePath("/admin/utilisateurs");

		return {
			status: ActionStatus.SUCCESS,
			message: `L'utilisateur ${user.name || user.email} a ete supprime.`,
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
			message: "Une erreur est survenue lors de la suppression de l'utilisateur.",
		};
	}
}
