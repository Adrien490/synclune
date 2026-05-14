import { MaterialDetailStatsCard } from "./material-detail-stats-card";

interface MaterialDetailStatsCardAsyncProps {
	skusCount: number;
	productsCountPromise: Promise<number>;
}

/**
 * Async wrapper rendered inside a `<Suspense>` boundary by `MaterialDetailPage`.
 * Allows the page shell + main cards to stream while the distinct-product
 * count query (admin-only KPI) resolves in parallel.
 */
export async function MaterialDetailStatsCardAsync({
	skusCount,
	productsCountPromise,
}: MaterialDetailStatsCardAsyncProps) {
	const productsCount = await productsCountPromise;
	return <MaterialDetailStatsCard skusCount={skusCount} productsCount={productsCount} />;
}
