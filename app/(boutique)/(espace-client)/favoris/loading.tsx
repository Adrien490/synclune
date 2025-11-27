import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AccountNav } from "@/modules/users/components/account-nav";
import { WishlistGridSkeleton } from "@/modules/wishlist/components";

export default function WishlistLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes favoris"
				description="Retrouvez tous vos coups de cœur"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Favoris", href: "/favoris" },
				]}
				action={<Skeleton className="h-8 w-32" />}
			/>

			<section className="bg-background py-6 sm:py-8 pb-24 lg:pb-8">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex gap-8">
						{/* Sidebar desktop */}
						<AccountNav variant="desktop-only" />

						{/* Contenu principal */}
						<div className="flex-1 min-w-0">
							<WishlistGridSkeleton />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
