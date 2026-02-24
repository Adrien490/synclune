import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";

export default function WishlistLoading() {
	return (
		<div
			className="min-h-screen relative"
			role="status"
			aria-busy="true"
			aria-label="Chargement des favoris"
		>
			<span className="sr-only">Chargement des favoris...</span>

			<PageHeaderSkeleton hasDescription={false} />

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					<WishlistGridSkeleton />
				</div>
			</section>
		</div>
	);
}
