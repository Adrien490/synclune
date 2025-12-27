import { PageHeader } from "@/shared/components/page-header";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";

export default function WishlistLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes favoris"
				description="Retrouvez tous vos coups de cœur"
				breadcrumbs={[{ label: "Favoris", href: "/favoris" }]}
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<WishlistGridSkeleton />
				</div>
			</section>
		</div>
	);
}
