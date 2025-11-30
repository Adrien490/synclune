"use server";

import { AccountStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { suspendUserSchema } from "../../schemas/user-admin.schemas";

export async function suspendUser(
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
		const validation = suspendUserSchema.safeParse({ id });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const { id: userId } = validation.data;

		// 3. Verifier qu'on ne suspend pas son propre compte
		const currentUser = await getCurrentUser();
		if (currentUser?.id === userId) {
			return {
				status: ActionStatus.ERROR,
				message: "Vous ne pouvez pas suspendre votre propre compte.",
			};
		}

		// 4. Verifier que l'utilisateur existe
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

		if (user.deletedAt) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet utilisateur est supprime. Restaurez-le d'abord.",
			};
		}

		if (user.suspendedAt) {
			return {
				status: ActionStatus.ERROR,
				message: "Cet utilisateur est deja suspendu.",
			};
		}

		// 5. Suspendre l'utilisateur
		await prisma.user.update({
			where: { id: userId },
			data: {
				suspendedAt: new Date(),
				accountStatus: AccountStatus.INACTIVE,
			},
		});

		// 6. Revalider la page
		revalidatePath("/admin/utilisateurs");

		return {
			status: ActionStatus.SUCCESS,
			message: `L'utilisateur ${user.name || user.email} a ete suspendu.`,
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
			message: "Une erreur est survenue lors de la suspension de l'utilisateur.",
		};
	}
}
