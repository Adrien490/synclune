import { PageHeader } from "@/shared/components/page-header";
import { WishlistGridSkeleton } from "@/modules/wishlist/components/wishlist-grid-skeleton";

export default function WishlistLoading() {
	return (
		<>
			<PageHeader
				title="Mes favoris"
				description="Retrouvez tous vos coups de cœur"
				variant="compact"
			/>

			<WishlistGridSkeleton />
		</>
	);
}
