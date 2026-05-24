import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";

export default function WishlistLoading() {
	return (
		<div
			className="relative min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label="Chargement des favoris"
		>
			<span className="sr-only">Chargement des favoris…</span>

			<PageHeaderSkeleton hasDescription={false} className="hidden sm:block" />

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height)+1rem)] pb-12 sm:pt-4 lg:pt-6 lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
					<WishlistGridSkeleton />
				</div>
			</section>
		</div>
	);
}
