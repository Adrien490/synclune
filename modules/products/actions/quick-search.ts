"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { logger } from "@/shared/lib/logger";
import { PRODUCT_SEARCH_LIMIT } from "@/shared/lib/rate-limit-config";

import { quickSearchProducts, type QuickSearchResult } from "../data/quick-search-products";
import { sanitizeForLog } from "../utils/search-helpers";

const quickSearchSchema = z.string().trim().max(100);

// Sampling 10% — zero-result is a high-frequency event (one per failed search).
// Capturing every occurrence floods Sentry quota without adding signal.
const ZERO_RESULT_SAMPLE_RATE = 0.1;

function bucketQueryLength(length: number): "1-3" | "4-10" | "11-30" | "31+" {
	if (length <= 3) return "1-3";
	if (length <= 10) return "4-10";
	if (length <= 30) return "11-30";
	return "31+";
}

function bucketLatency(ms: number): "<100" | "<250" | "<500" | "<1000" | ">=1000" {
	if (ms < 100) return "<100";
	if (ms < 250) return "<250";
	if (ms < 500) return "<500";
	if (ms < 1000) return "<1000";
	return ">=1000";
}

export async function quickSearch(query: string): Promise<QuickSearchResult> {
	const startTime = performance.now();
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(PRODUCT_SEARCH_LIMIT);
		if ("error" in rateCheck) return { kind: "rate-limited" };

		const parsed = quickSearchSchema.safeParse(query);
		if (!parsed.success) {
			return { kind: "success", products: [], suggestion: null, totalCount: 0 };
		}

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

			if (Math.random() < ZERO_RESULT_SAMPLE_RATE) {
				Sentry.captureMessage("search.zero_result", {
					level: "info",
					tags: {
						action: "quick-search",
						kind: "zero-result",
						hasSuggestion: String(hasSuggestion),
						queryLength: bucketQueryLength(sanitizedQuery.length),
						latencyBucket: bucketLatency(responseTimeMs),
					},
					extra: {
						term: sanitizedTerm,
						suggestion: result.suggestion ?? null,
						responseTimeMs,
						sampleRate: ZERO_RESULT_SAMPLE_RATE,
					},
				});
			}
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
