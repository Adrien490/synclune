import { cacheLife, cacheTag } from "next/cache";

import { Prisma, type AccountStatus, type Role } from "@/app/generated/prisma/client";
import { logger } from "@/shared/lib/logger";
import { prisma, notDeleted } from "@/shared/lib/prisma";

import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

const QUICK_SEARCH_LIMIT = 6;

export type AdminQuickSearchUserItem = {
	id: string;
	name: string | null;
	email: string;
	image: string | null;
	role: Role;
	accountStatus: AccountStatus;
	createdAt: Date;
};

export type AdminQuickSearchUsersResult =
	| { kind: "success"; items: AdminQuickSearchUserItem[]; totalCount: number }
	| { kind: "error" };

/**
 * Lightweight admin user search for the live preview drawer.
 * ILIKE on name + email (matches `buildUserWhereClause` exact branch).
 */
export async function quickSearchUsersAdmin(
	searchTerm: string,
): Promise<AdminQuickSearchUsersResult> {
	"use cache";
	cacheLife("user");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_CUSTOMERS_LIST);

	const term = searchTerm.trim();
	if (!term || term.length < 2) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	try {
		const where: Prisma.UserWhereInput = {
			...notDeleted,
			OR: [
				{ name: { contains: term, mode: Prisma.QueryMode.insensitive } },
				{ email: { contains: term, mode: Prisma.QueryMode.insensitive } },
			],
		};

		const [users, totalCount] = await Promise.all([
			prisma.user.findMany({
				where,
				orderBy: { createdAt: "desc" },
				take: QUICK_SEARCH_LIMIT,
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
					role: true,
					accountStatus: true,
					createdAt: true,
				},
			}),
			prisma.user.count({ where }),
		]);

		return { kind: "success", items: users, totalCount };
	} catch (error) {
		logger.error("Admin quick search users failed", error, {
			service: "quickSearchUsersAdmin",
		});
		return { kind: "error" };
	}
}
