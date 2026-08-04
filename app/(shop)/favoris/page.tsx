import { PageHeader } from "@/shared/components/page-header";
import { WishlistList } from "@/modules/wishlist/components/wishlist-list";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";

import { getWishlist } from "@/modules/wishlist/data/get-wishlist";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Mes favoris",
	robots: { index: false, follow: false },
};

export default async function WishlistPage() {
	const wishlistPromise = getWishlist();

	return (
		<div className="relative min-h-dvh">
			{/* noStructuredData: page noindex (favoris personnels) → BreadcrumbList inutile */}
			<PageHeader
				title="Mes favoris"
				breadcrumbs={[{ label: "Mes favoris", href: "/favoris" }]}
				className="hidden sm:block"
				accent="underline"
				noStructuredData
			/>

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height)+1rem)] pb-12 sm:pt-4 lg:pt-6 lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
					<Suspense fallback={<WishlistGridSkeleton />}>
						<WishlistList wishlistPromise={wishlistPromise} />
					</Suspense>
				</div>
			</section>
		</div>
	);
}
