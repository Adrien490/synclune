import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import { StructuredData } from "./structured-data";

/**
 * Wrapper async pour StructuredData.
 * Charge les stats d'avis de maniere non-bloquante via Suspense.
 */
export async function StructuredDataAsync() {
	const reviewStats = await getGlobalReviewStats();
	return <StructuredData reviewStats={reviewStats} />;
}
