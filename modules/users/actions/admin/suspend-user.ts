"use server";

import { updateTag } from "next/cache";
import { AccountStatus } from "@/app/generated/prisma";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	requireAdmin,
	requireAuth,
	enforceRateLimitForCurrentUser,
	validateInput,
	success,
	error,
	notFound,
	handleActionError,
} from "@/shared/lib/actions";
import { suspendUserSchema } from "../../schemas/user-admin.schemas";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

// Rate limit: 20 requêtes par minute
const SUSPEND_USER_RATE_LIMIT = { limit: 20, windowMs: 60 * 1000 };

export async function suspendUser(
	_prevState: unknown,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(SUSPEND_USER_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Verification des droits admin
		const adminCheck = await requireAdmin();
		if ("error" in adminCheck) return adminCheck.error;

		// 3. Extraire et valider l'ID
		const rawData = { id: formData.get("id") as string };
		const validation = validateInput(suspendUserSchema, rawData);
		if ("error" in validation) return validation.error;

		const { id: userId } = validation.data;

		// 4. Verifier qu'on ne suspend pas son propre compte
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		if (userAuth.user.id === userId) {
			return error("Vous ne pouvez pas suspendre votre propre compte.");
		}

		// 5. Verifier que l'utilisateur existe
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, name: true, email: true, suspendedAt: true, deletedAt: true },
		});

		if (!user) {
			return notFound("Utilisateur");
		}

		if (user.deletedAt) {
			return error("Cet utilisateur est supprime. Restaurez-le d'abord.");
		}

		if (user.suspendedAt) {
			return error("Cet utilisateur est deja suspendu.");
		}

		// 6. Suspendre l'utilisateur ET invalider ses sessions
		await prisma.$transaction([
			prisma.user.update({
				where: { id: userId },
				data: {
					suspendedAt: new Date(),
					accountStatus: AccountStatus.INACTIVE,
				},
			}),
			// Invalider toutes les sessions pour forcer la deconnexion
			prisma.session.deleteMany({
				where: { userId },
			}),
		]);

		// 7. Revalider le cache
		updateTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		return success(`L'utilisateur ${user.name || user.email} a ete suspendu.`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suspension de l'utilisateur");
	}
}
