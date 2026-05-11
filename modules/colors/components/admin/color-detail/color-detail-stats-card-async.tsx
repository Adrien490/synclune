import { ColorDetailStatsCard } from "./color-detail-stats-card";

interface ColorDetailStatsCardAsyncProps {
	skusCount: number;
	productsCountPromise: Promise<number>;
}

/**
 * Async wrapper rendered inside a `<Suspense>` boundary by `ColorDetailPage`.
 * Allows the page shell + main cards to stream while the distinct-product
 * count query (admin-only KPI) resolves in parallel.
 */
export async function ColorDetailStatsCardAsync({
	skusCount,
	productsCountPromise,
}: ColorDetailStatsCardAsyncProps) {
	const productsCount = await productsCountPromise;
	return <ColorDetailStatsCard skusCount={skusCount} productsCount={productsCount} />;
}
