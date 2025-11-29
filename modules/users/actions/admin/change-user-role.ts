"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { prisma } from "@/shared/lib/prisma";
import { Role } from "@/app/generated/prisma/client";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { changeUserRoleSchema } from "../../schemas/user-admin.schemas";

export async function changeUserRole(
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

		// 2. Extraire les donnees du FormData
		const id = formData.get("id") as string;
		const role = formData.get("role") as Role;

		// Valider les donnees
		const validation = changeUserRoleSchema.safeParse({ id, role });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const { id: userId, role: newRole } = validation.data;

		// 3. Verifier qu'on ne change pas son propre role
		const currentUser = await getCurrentUser();
		if (currentUser?.id === userId) {
			return {
				status: ActionStatus.ERROR,
				message: "Vous ne pouvez pas changer votre propre role.",
			};
		}

		// 4. Verifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, role: true, deletedAt: true },
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
				message: "Impossible de changer le role d'un utilisateur supprime.",
			};
		}

		if (user.role === newRole) {
			return {
				status: ActionStatus.ERROR,
				message: `Cet utilisateur a deja le role ${newRole}.`,
			};
		}

		// 5. Si on retire le role admin, verifier qu'il reste au moins un admin
		if (user.role === Role.ADMIN && newRole === Role.USER) {
			const adminCount = await prisma.user.count({
				where: {
					role: Role.ADMIN,
					deletedAt: null,
				},
			});

			if (adminCount <= 1) {
				return {
					status: ActionStatus.ERROR,
					message: "Impossible de retirer le dernier administrateur.",
				};
			}
		}

		// 6. Changer le role
		await prisma.user.update({
			where: { id: userId },
			data: { role: newRole },
		});

		// 7. Revalider la page
		revalidatePath("/admin/utilisateurs");

		const roleLabel = newRole === Role.ADMIN ? "administrateur" : "utilisateur";
		return {
			status: ActionStatus.SUCCESS,
			message: `${user.name || user.email} est maintenant ${roleLabel}.`,
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
			message: "Une erreur est survenue lors du changement de role.",
		};
	}
}
