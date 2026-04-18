"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { logger } from "@/shared/lib/logger";
import { PRODUCT_SEARCH_LIMIT } from "@/shared/lib/rate-limit-config";

import { quickSearchProducts, type QuickSearchResult } from "../data/quick-search-products";
import { sanitizeForLog } from "../utils/search-helpers";

const EMPTY_RESULT: QuickSearchResult = {
	kind: "success",
	products: [],
	suggestion: null,
	totalCount: 0,
};

const quickSearchSchema = z.string().trim().max(100);

export async function quickSearch(query: string): Promise<QuickSearchResult> {
	const startTime = performance.now();
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_SEARCH_LIMIT);
		if ("error" in rateCheck) return { kind: "rate-limited" };

		const parsed = quickSearchSchema.safeParse(query);
		if (!parsed.success) return EMPTY_RESULT;

		const sanitizedQuery = parsed.data;

		const result = await quickSearchProducts(sanitizedQuery);

		if (result.kind === "success" && result.totalCount === 0) {
			const responseTimeMs = Math.round(performance.now() - startTime);
			const sanitizedTerm = sanitizeForLog(sanitizedQuery);
			const hasSuggestion = Boolean(result.suggestion);

			logger.warn(
				`Zero-result search | term="${sanitizedTerm}" | suggestion="${result.suggestion ?? "none"}" | duration=${responseTimeMs}ms`,
				{ action: "quick-search" },
			);

			Sentry.captureMessage("search.zero_result", {
				level: "info",
				tags: {
					action: "quick-search",
					kind: "zero-result",
					hasSuggestion: String(hasSuggestion),
				},
				extra: {
					term: sanitizedTerm,
					suggestion: result.suggestion ?? null,
					responseTimeMs,
				},
			});
		}

		return result;
	} catch (error) {
		logger.error("Quick search failed", error, {
			action: "quick-search",
			service: "quick-search",
			term: sanitizeForLog(query),
		});
		return { kind: "error" };
	}
}
