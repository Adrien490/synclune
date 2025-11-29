"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { prisma } from "@/shared/lib/prisma";
import { Role } from "@/app/generated/prisma/client";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";
import { bulkChangeUserRoleSchema } from "../../schemas/user-admin.schemas";

export async function bulkChangeUserRole(
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
		const idsString = formData.get("ids");
		const ids = idsString ? JSON.parse(idsString as string) : [];
		const role = formData.get("role") as Role;

		// Valider les donnees
		const validation = bulkChangeUserRoleSchema.safeParse({ ids, role });

		if (!validation.success) {
			const firstError = validation.error.issues?.[0];
			return {
				status: ActionStatus.ERROR,
				message: firstError?.message || "Donnees invalides",
			};
		}

		const validatedData = validation.data;

		// 3. Verifier qu'on ne change pas son propre role
		const currentUser = await getCurrentUser();
		if (currentUser && validatedData.ids.includes(currentUser.id)) {
			return {
				status: ActionStatus.ERROR,
				message: "Vous ne pouvez pas changer votre propre role.",
			};
		}

		// 4. Filtrer les utilisateurs eligibles (non supprimes, avec role different)
		const eligibleUsers = await prisma.user.findMany({
			where: {
				id: { in: validatedData.ids },
				deletedAt: null,
				role: { not: validatedData.role },
			},
			select: { id: true, role: true },
		});

		if (eligibleUsers.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun utilisateur eligible pour le changement de role.",
			};
		}

		// 5. Si on retire le role admin, verifier qu'il reste au moins un admin
		if (validatedData.role === Role.USER) {
			const adminsToDowngrade = eligibleUsers.filter((u) => u.role === Role.ADMIN);

			if (adminsToDowngrade.length > 0) {
				const totalAdminCount = await prisma.user.count({
					where: {
						role: Role.ADMIN,
						deletedAt: null,
					},
				});

				if (totalAdminCount - adminsToDowngrade.length < 1) {
					return {
						status: ActionStatus.ERROR,
						message: "Impossible de retirer tous les administrateurs. Au moins un admin doit rester.",
					};
				}
			}
		}

		const eligibleIds = eligibleUsers.map((u) => u.id);

		// 6. Changer les roles
		const result = await prisma.user.updateMany({
			where: { id: { in: eligibleIds } },
			data: { role: validatedData.role },
		});

		// 7. Revalider la page
		revalidatePath("/admin/utilisateurs");

		const roleLabel = validatedData.role === Role.ADMIN ? "administrateurs" : "utilisateurs";
		return {
			status: ActionStatus.SUCCESS,
			message: `${result.count} utilisateur${result.count > 1 ? "s" : ""} ${result.count > 1 ? "sont" : "est"} maintenant ${roleLabel}.`,
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
