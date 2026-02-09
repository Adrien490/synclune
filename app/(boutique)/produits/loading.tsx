import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function BijouxHubLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Les créations"
				description="Découvrez toutes mes créations colorées faites main dans mon atelier à Nantes. Des pièces uniques inspirées de mes passions !"
				breadcrumbs={[{ label: "Créations", href: "/produits" }]}
			/>

			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="group/container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Toolbar skeleton - Desktop only */}
					<div className="hidden md:flex md:rounded-lg md:bg-card md:border md:border-border/60 min-w-0 p-0 md:p-4 md:shadow-sm">
						<div className="flex flex-row gap-2 items-center w-full">
							<div className="flex-1 min-w-0">
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="flex flex-row items-center gap-2 shrink-0">
								<Skeleton className="h-11 w-45 rounded-md" />
								<Skeleton className="h-11 w-[90px] rounded-md" />
							</div>
						</div>
					</div>

					<ProductListSkeleton />
				</div>
			</section>

			{/* Bottom Action Bar Skeleton - Mobile only */}
			<div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-background/95 border-t border-x border-border rounded-t-2xl">
				<div className="flex items-stretch h-14">
					{[0, 1, 2].map((i) => (
						<div key={i} className="flex-1 flex flex-col items-center justify-center gap-1">
							<Skeleton className="size-5 rounded" />
							<Skeleton className="h-3 w-12 rounded" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
