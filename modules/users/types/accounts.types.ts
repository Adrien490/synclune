import { type Prisma } from "@/app/generated/prisma/client";
import { type z } from "zod";
import { type PaginationInfo } from "@/shared/lib/pagination";
import { type GET_ACCOUNTS_DEFAULT_SELECT } from "../constants/accounts.constants";
import { type getAccountsSchema } from "../schemas/accounts.schemas";

// ============================================================================
// TYPES - ACCOUNTS LIST
// ============================================================================

export type GetAccountsReturn = {
	accounts: Array<
		Prisma.AccountGetPayload<{
			select: typeof GET_ACCOUNTS_DEFAULT_SELECT;
		}> & {
			hasAccessToken: boolean;
			hasRefreshToken: boolean;
			isAccessTokenExpired: boolean;
			isRefreshTokenExpired: boolean;
		}
	>;
	pagination: PaginationInfo;
};

export type GetAccountsParams = z.infer<typeof getAccountsSchema>;
