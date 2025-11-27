import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { GET_VERIFICATION_SELECT } from "../constants/verification.constants";
import { getVerificationSchema } from "../schemas/verification.schemas";

// ============================================================================
// TYPES - VERIFICATION
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
