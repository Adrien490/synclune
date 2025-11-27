import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { WishlistGridSkeleton } from "@/modules/wishlist/components";

export default function WishlistLoading() {
	const breadcrumbs = [
		{ label: "Mon compte", href: "/compte" },
		{ label: "Ma liste de souhaits", href: "/liste-de-souhaits" },
	];

	return (
		<>
			<PageHeader
				title="Ma liste de souhaits"
				description="Retrouvez tous vos coups de cœur"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Actions skeleton */}
					<div className="flex justify-end">
						<Skeleton className="h-8 w-32" />
					</div>

					<WishlistGridSkeleton />
				</div>
			</section>
		</>
	);
}
