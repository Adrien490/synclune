"use server";

import { z } from "zod";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SEARCH_LIMIT } from "@/shared/lib/rate-limit-config";

import {
	quickSearchProductsAdmin,
	type AdminQuickSearchProductItem,
} from "../data/quick-search-products-admin";

import type { AdminQuickSearchResult } from "@/shared/components/sticky-action-bar";

const querySchema = z.string().trim().min(1).max(100);

/**
 * Server Action calling `quickSearchProductsAdmin` with auth + rate limit.
 * Wired to the admin products quick-search adapter (live mobile preview).
 */
export async function quickSearchProductsAdminAction(
	query: string,
): Promise<AdminQuickSearchResult<AdminQuickSearchProductItem>> {
	const admin = await requireAdmin();
	if ("error" in admin) return { kind: "error", message: admin.error.message };

	const rate = await enforceRateLimitForCurrentUser(ADMIN_SEARCH_LIMIT);
	if ("error" in rate) {
		return { kind: "rate-limited", message: rate.error.message };
	}

	const parsed = querySchema.safeParse(query);
	if (!parsed.success) {
		return { kind: "success", items: [], totalCount: 0 };
	}

	const result = await quickSearchProductsAdmin(parsed.data);
	if (result.kind === "error") {
		return { kind: "error" };
	}

	return { kind: "success", items: result.items, totalCount: result.totalCount };
}
