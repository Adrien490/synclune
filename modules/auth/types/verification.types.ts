import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import {
	GET_VERIFICATION_SELECT,
	GET_VERIFICATIONS_DEFAULT_SELECT,
} from "../constants/verification.constants";
import {
	getVerificationSchema,
	getVerificationsSchema,
} from "../schemas/verification.schemas";

// ============================================================================
// TYPES - VERIFICATION (single)
// ============================================================================

export type GetVerificationParams = z.infer<typeof getVerificationSchema>;

type RawVerificationResult = Prisma.VerificationGetPayload<{
	select: typeof GET_VERIFICATION_SELECT;
}>;

export type GetVerificationReturn = Omit<RawVerificationResult, "value"> & {
	valueMasked: string | null;
};

export type Verification = Prisma.VerificationGetPayload<{
	select: typeof GET_VERIFICATION_SELECT;
}>;

// ============================================================================
// TYPES - VERIFICATIONS (list)
// ============================================================================

export type GetVerificationsParams = z.infer<typeof getVerificationsSchema>;

export type GetVerificationsReturn = {
	verifications: Array<
		Prisma.VerificationGetPayload<{
			select: typeof GET_VERIFICATIONS_DEFAULT_SELECT;
		}> & {
			valuePreview: string;
			isExpired: boolean;
		}
	>;
	pagination: PaginationInfo;
};
