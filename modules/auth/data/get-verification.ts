import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";

import { GET_VERIFICATION_SELECT } from "../constants/verification.constants";
import { cacheAuthVerifications } from "../utils/cache.utils";
import { getVerificationSchema } from "../schemas/verification.schemas";
import type {
	GetVerificationParams,
	GetVerificationReturn,
} from "../types/verification.types";

// Re-export pour compatibilité
export { GET_VERIFICATION_SELECT } from "../constants/verification.constants";
export { getVerificationSchema } from "../schemas/verification.schemas";
export type {
	GetVerificationParams,
	GetVerificationReturn,
} from "../types/verification.types";

// ============================================================================
// UTILS
// ============================================================================

function maskVerificationValue(value: string | null | undefined) {
	if (!value) {
		return null;
	}

	if (value.length <= 6) {
		return `${value.at(0) ?? ""}...${value.at(-1) ?? ""}`;
	}

	return `${value.slice(0, 4)}...${value.slice(-2)}`;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère une vérification par son ID (admin uniquement)
 */
export async function getVerification(
	params: Partial<GetVerificationParams>
): Promise<GetVerificationReturn | null> {
	const validation = getVerificationSchema.safeParse(params ?? {});

	if (!validation.success) {
		return null;
	}

	const admin = await isAdmin();

	if (!admin) {
		return null;
	}

	return fetchVerification(validation.data);
}

/**
 * Récupère une vérification depuis la DB avec cache
 */
export async function fetchVerification(
	params: GetVerificationParams
): Promise<GetVerificationReturn | null> {
	"use cache";
	cacheAuthVerifications();

	try {
		const verification = await prisma.verification.findUnique({
			where: { id: params.id },
			select: GET_VERIFICATION_SELECT,
		});

		if (!verification) {
			return null;
		}

		const { value, ...rest } = verification;

		return {
			...rest,
			valueMasked: maskVerificationValue(value),
		};
	} catch (error) {
		return null;
	}
}
