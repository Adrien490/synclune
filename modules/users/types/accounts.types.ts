import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { PaginationInfo } from "@/shared/components/cursor-pagination/pagination";
import { GET_ACCOUNTS_DEFAULT_SELECT } from "../constants/accounts.constants";
import { getAccountsSchema } from "../schemas/accounts.schemas";

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
