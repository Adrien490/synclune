import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type GET_ACCOUNT_DEFAULT_SELECT } from "../constants/account.constants";
import { type getAccountSchema } from "../schemas/accounts.schemas";

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
