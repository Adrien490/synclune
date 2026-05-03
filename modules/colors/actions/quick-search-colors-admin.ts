"use server";

import { z } from "zod";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_SEARCH_LIMIT } from "@/shared/lib/rate-limit-config";

import {
	quickSearchColorsAdmin,
	type AdminQuickSearchColorItem,
} from "../data/quick-search-colors-admin";

import type { AdminQuickSearchResult } from "@/shared/components/sticky-action-bar";

const querySchema = z.string().trim().min(1).max(100);

export async function quickSearchColorsAdminAction(
	query: string,
): Promise<AdminQuickSearchResult<AdminQuickSearchColorItem>> {
	const admin = await requireAdmin();
	if ("error" in admin) return { kind: "error", message: admin.error.message };

	const rate = await enforceRateLimitForCurrentUser(ADMIN_SEARCH_LIMIT);
	if ("error" in rate) return { kind: "rate-limited", message: rate.error.message };

	const parsed = querySchema.safeParse(query);
	if (!parsed.success) return { kind: "success", items: [], totalCount: 0 };

	const result = await quickSearchColorsAdmin(parsed.data);
	if (result.kind === "error") return { kind: "error" };

	return { kind: "success", items: result.items, totalCount: result.totalCount };
}
