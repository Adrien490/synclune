import { cacheLife, cacheTag } from "next/cache";

import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";

import { cacheCurrentUser } from "../constants/cache";

export type GetUserDetailAdminReturn = {
	user: {
		id: string;
		name: string | null;
		email: string;
		role: string;
		emailVerified: boolean;
		deletedAt: Date | null;
		suspendedAt: Date | null;
		createdAt: Date;
	};
	orderCount: number;
};

/**
 * Récupère un utilisateur (vue admin) avec son nombre de commandes.
 * Inclut les utilisateurs supprimés/suspendus pour l'admin.
 *
 * @internal Admin-only — appeler uniquement depuis un contexte admin-gated.
 */
export async function getUserDetailAdmin(userId: string): Promise<GetUserDetailAdminReturn | null> {
	"use cache";
	cacheLife("user");
	cacheCurrentUser(userId);
	cacheTag(`user-orders-count-${userId}`);

	try {
		const user = await prisma.user.findFirst({
			where: { id: userId },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				emailVerified: true,
				deletedAt: true,
				suspendedAt: true,
				createdAt: true,
			},
		});

		if (!user) return null;

		const orderCount = await prisma.order.count({
			where: { userId, ...notDeleted },
		});

		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				emailVerified: user.emailVerified,
				deletedAt: user.deletedAt,
				suspendedAt: user.suspendedAt,
				createdAt: user.createdAt,
			},
			orderCount,
		};
	} catch (error) {
		logger.error("Failed to fetch user detail admin", error, {
			service: "getUserDetailAdmin",
		});
		return null;
	}
}
