import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import { StructuredData } from "./structured-data";

/**
 * Async wrapper for StructuredData.
 * Loads review stats non-blockingly via Suspense.
 */
export async function StructuredDataAsync() {
	return <StructuredData reviewStatsPromise={getGlobalReviewStats()} />;
}
