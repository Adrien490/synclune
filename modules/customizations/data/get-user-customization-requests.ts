import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { CUSTOMIZATION_CACHE_TAGS } from "../constants/cache";

const GET_USER_CUSTOMIZATION_REQUESTS_SELECT = {
	id: true,
	createdAt: true,
	productTypeLabel: true,
	details: true,
	status: true,
	respondedAt: true,
	inspirationProducts: {
		select: {
			id: true,
			title: true,
			slug: true,
			skus: {
				where: { isDefault: true as const },
				select: {
					images: {
						take: 1,
						select: { url: true },
					},
				},
			},
		},
	},
} as const;

export type UserCustomizationRequest = NonNullable<
	Awaited<ReturnType<typeof getUserCustomizationRequests>>
>[number];

/**
 * Retrieves all customization requests for the current user
 */
export async function getUserCustomizationRequests() {
	const session = await getSession();
	if (!session?.user?.id) return null;
	return fetchUserCustomizationRequests(session.user.id);
}

async function fetchUserCustomizationRequests(userId: string) {
	"use cache: private";
	cacheLife("dashboard");
	cacheTag(CUSTOMIZATION_CACHE_TAGS.USER_REQUESTS(userId));

	try {
		return await prisma.customizationRequest.findMany({
			where: { userId, ...notDeleted },
			select: GET_USER_CUSTOMIZATION_REQUESTS_SELECT,
			orderBy: { createdAt: "desc" },
		});
	} catch (error) {
		console.error("[GET_USER_CUSTOMIZATION_REQUESTS]", error);
		return [];
	}
}
