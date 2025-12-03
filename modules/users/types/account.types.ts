import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { GET_ACCOUNT_DEFAULT_SELECT } from "../constants/account.constants";
import { getAccountSchema } from "../schemas/accounts.schemas";

// ============================================================================
// TYPES - ACCOUNT
// ============================================================================

export type GetAccountParams = z.infer<typeof getAccountSchema>;

export type GetAccountReturn = Prisma.AccountGetPayload<{
	select: typeof GET_ACCOUNT_DEFAULT_SELECT;
}>;

export interface FetchAccountContext {
	admin: boolean;
	userId?: string;
}
