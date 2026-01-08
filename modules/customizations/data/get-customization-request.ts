import { prisma, notDeleted } from "@/shared/lib/prisma";
import { isAdmin } from "@/modules/auth/utils/guards";

import { cacheCustomizationDetail } from "../constants/cache";
import type { CustomizationRequestDetail } from "../types/customization.types";

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère une demande de personnalisation par son ID
 * Réservé aux administrateurs (defense in depth)
 */
export async function getCustomizationRequest(
	id: string
): Promise<CustomizationRequestDetail | null> {
	const admin = await isAdmin();
	if (!admin) return null;

	return fetchCustomizationRequest(id);
}

// ============================================================================
// FETCH FUNCTION (CACHED)
// ============================================================================

async function fetchCustomizationRequest(
	id: string
): Promise<CustomizationRequestDetail | null> {
	"use cache";
	cacheCustomizationDetail(id);

	try {
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
									},
								},
							},
						},
					},
				},
			},
		});

		return request;
	} catch (error) {
		console.error("[GET_CUSTOMIZATION_REQUEST]", error);
		return null;
	}
}
