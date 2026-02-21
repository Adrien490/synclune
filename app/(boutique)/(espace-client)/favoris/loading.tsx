import { PageHeader } from "@/shared/components/page-header";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";
import { ROUTES } from "@/shared/constants/urls";

export default function WishlistLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes favoris"
				description="Retrouvez tous vos coups de cœur"
				breadcrumbs={[
					{ label: "Mon compte", href: ROUTES.ACCOUNT.ROOT },
					{ label: "Favoris", href: ROUTES.ACCOUNT.FAVORITES },
				]}
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<WishlistGridSkeleton />
				</div>
			</section>
		</div>
	);
}
