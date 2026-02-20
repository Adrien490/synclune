import { getSession } from "@/modules/auth/lib/get-current-session";
import { isAdmin } from "@/modules/auth/utils/guards";
import { Prisma } from "@/app/generated/prisma/client";
import { cacheUserAccounts } from "../constants/cache";
import { cacheDefault } from "@/shared/lib/cache";
import { prisma } from "@/shared/lib/prisma";

import { GET_ACCOUNT_DEFAULT_SELECT } from "../constants/account.constants";
import { getAccountSchema } from "../schemas/accounts.schemas";
import type {
	GetAccountParams,
	GetAccountReturn,
	FetchAccountContext,
} from "../types/account.types";

// Re-export pour compatibilité
export { GET_ACCOUNT_DEFAULT_SELECT } from "../constants/account.constants";
export { getAccountSchema } from "../schemas/accounts.schemas";
export type {
	GetAccountParams,
	GetAccountReturn,
	FetchAccountContext,
} from "../types/account.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

export async function getAccount(
	params: GetAccountParams
): Promise<GetAccountReturn | null> {
	const admin = await isAdmin();
	const session = await getSession();

	if (!admin) {
		return null;
	}

	const validation = getAccountSchema.safeParse(params);

	if (!validation.success) {
		return null;
	}

	return fetchAccount(validation.data, { admin, userId: session?.user?.id });
}

export async function fetchAccount(
	params: GetAccountParams,
	context: FetchAccountContext
): Promise<GetAccountReturn | null> {
	"use cache: private";
	// Cache by userId if available, otherwise use generic dashboard cache
	if (context.userId) {
		cacheUserAccounts(context.userId);
	} else {
		cacheDefault();
	}

	const where: Prisma.AccountWhereInput = {
		id: params.id,
	};

	// Restriction par userId si non admin
	if (!context.admin && context.userId) {
		where.userId = context.userId;
	}

	try {
		const account = await prisma.account.findFirst({
			where,
			select: GET_ACCOUNT_DEFAULT_SELECT,
		});

		return account;
	} catch (error) {
		if (process.env.NODE_ENV !== "production") {
			// console.error("fetchAccount error:", error);
		}
		return null;
	}
}
