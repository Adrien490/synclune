import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function BijouxHubLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				className="hidden sm:block"
				title="Les créations"
				description="Découvrez toutes mes créations colorées faites main dans mon atelier. Des pièces uniques inspirées de mes passions !"
				breadcrumbs={[{ label: "Créations", href: "/produits" }]}
			/>

			<section className="bg-background relative z-10 pt-[calc(var(--navbar-height)+1rem)] pb-12 sm:pt-4 lg:pt-6 lg:pb-16">
				<div className="group/container mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
					{/* Mobile sticky sub-header skeleton (tri / recherche / filtres) */}
					<div
						aria-hidden
						className="bg-background/80 border-border/50 -mx-4 border-b backdrop-blur-md sm:-mx-6 md:hidden"
					>
						<div className="divide-border/30 flex items-stretch divide-x">
							{[0, 1, 2].map((i) => (
								<div key={i} className="flex flex-1 items-center justify-center gap-1.5 px-2 py-3">
									<Skeleton className="size-4 rounded" />
									<Skeleton className="h-3 w-14 rounded" />
								</div>
							))}
						</div>
					</div>

					{/* Toolbar skeleton - Desktop only */}
					<div className="md:bg-card md:border-border/60 hidden min-w-0 p-0 md:flex md:rounded-lg md:border md:p-4 md:shadow-sm">
						<div className="flex w-full flex-row items-center gap-2">
							<div className="min-w-0 flex-1">
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
							<div className="flex shrink-0 flex-row items-center gap-2">
								<Skeleton className="h-11 w-45 rounded-md" />
								<Skeleton className="h-11 w-[90px] rounded-md" />
							</div>
						</div>
					</div>

					<ProductListSkeleton />
				</div>
			</section>
		</div>
	);
}
