import { prisma, notDeleted } from "@/shared/lib/prisma";

import { cacheCustomizationDetail } from "../constants/cache";
import type { CustomizationRequestDetail } from "../types";

// ============================================================================
// DATA FUNCTION
// ============================================================================

export async function getCustomizationRequest(
	id: string
): Promise<CustomizationRequestDetail | null> {
	"use cache: remote";
	cacheCustomizationDetail(id);

	const request = await prisma.customizationRequest.findFirst({
		where: {
			id,
			...notDeleted,
		},
		select: {
			id: true,
			createdAt: true,
			updatedAt: true,
			firstName: true,
			lastName: true,
			email: true,
			phone: true,
			productTypeLabel: true,
			productType: {
				select: {
					id: true,
					label: true,
					slug: true,
				},
			},
			details: true,
			status: true,
			adminNotes: true,
			respondedAt: true,
			inspirationProducts: {
				select: {
					id: true,
					title: true,
					slug: true,
					skus: {
						where: { isDefault: true },
						take: 1,
						select: {
							id: true,
							images: {
								where: { isPrimary: true },
								take: 1,
								select: {
									url: true,
									thumbnailSmallUrl: true,
								},
							},
						},
					},
				},
			},
			preferredColors: {
				select: {
					id: true,
					name: true,
					hex: true,
				},
			},
			preferredMaterials: {
				select: {
					id: true,
					name: true,
					description: true,
				},
			},
		},
	});

	return request;
}
