"use server";

import { AccountStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { restoreUserSchema } from "../../schemas/user-admin.schemas";

export async function restoreUser(
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
		const validation = restoreUserSchema.safeParse({ id });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const { id: userId } = validation.data;

		// 3. Verifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, suspendedAt: true, deletedAt: true },
		});

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: "Utilisateur introuvable.",
			};
		}

		if (!user.deletedAt && !user.suspendedAt) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet utilisateur n'est ni supprime ni suspendu.",
			};
		}

		// 4. Restaurer l'utilisateur (clear both deletedAt and suspendedAt)
		await prisma.user.update({
			where: { id: userId },
			data: {
				deletedAt: null,
				suspendedAt: null,
				accountStatus: AccountStatus.ACTIVE,
			},
		});

		// 5. Revalider la page
		revalidatePath("/admin/utilisateurs");

		return {
			status: ActionStatus.SUCCESS,
			message: `L'utilisateur ${user.name || user.email} a ete restaure.`,
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
			message: "Une erreur est survenue lors de la restauration de l'utilisateur.",
		};
	}
}
