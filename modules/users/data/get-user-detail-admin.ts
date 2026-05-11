import { cacheLife, cacheTag } from "next/cache";

import { isAdmin } from "@/modules/auth/utils/guards";
import { SESSION_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { logger } from "@/shared/lib/logger";
import { notDeleted, prisma } from "@/shared/lib/prisma";

import { cacheCurrentUser, USERS_CACHE_TAGS } from "../constants/cache";

export type AdminUserActiveSession = {
	id: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
	expiresAt: Date;
};

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
	activeSessions: AdminUserActiveSession[];
};

/**
 * Récupère un utilisateur (vue admin) avec son nombre de commandes
 * et la liste de ses sessions actives.
 * Inclut les utilisateurs supprimés/suspendus pour l'admin.
 *
 * Wrapper avec contrôle d'accès admin (defense-in-depth). Renvoie `null`
 * pour un appelant non-admin afin de ne pas révéler l'existence du user.
 */
export async function getUserDetailAdmin(userId: string): Promise<GetUserDetailAdminReturn | null> {
	if (!(await isAdmin())) return null;
	return _fetchUserDetailAdmin(userId);
}

/**
 * @internal — appelé uniquement depuis `getUserDetailAdmin` (admin-gated).
 * Split nécessaire car `cookies()`/`headers()` via `isAdmin()` sont
 * incompatibles avec la directive `"use cache"`.
 */
async function _fetchUserDetailAdmin(userId: string): Promise<GetUserDetailAdminReturn | null> {
	"use cache";
	cacheLife("user");
	cacheCurrentUser(userId);
	cacheTag(USERS_CACHE_TAGS.USER_ORDERS_COUNT(userId));
	cacheTag(SESSION_CACHE_TAGS.SESSIONS(userId));

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

		const [orderCount, activeSessions] = await Promise.all([
			prisma.order.count({ where: { userId, ...notDeleted } }),
			prisma.session.findMany({
				where: { userId, expiresAt: { gt: new Date() } },
				select: {
					id: true,
					ipAddress: true,
					userAgent: true,
					createdAt: true,
					expiresAt: true,
				},
				orderBy: { createdAt: "desc" },
				take: 20,
			}),
		]);

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
			activeSessions,
		};
	} catch (error) {
		logger.error("Failed to fetch user detail admin", error, {
			service: "getUserDetailAdmin",
		});
		return null;
	}
}
