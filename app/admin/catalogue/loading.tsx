import { PageHeader } from "@/shared/components/page-header";
import { Card, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading state for catalog section navigation page
 * Structure alignee avec SectionNavigation:
 * - PageHeader
 * - Grid de cards navigation (4 liens en 3 colonnes)
 */
export default function CatalogLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du catalogue">
			<span className="sr-only">Chargement du catalogue...</span>

			{/* Page Header */}
			<PageHeader
				variant="compact"
				title="Catalogue"
				description="Gérez vos bijoux, collections et tout ce qui compose votre catalogue"
				className="hidden md:block"
			/>

			{/* Navigation Cards Grid - matches SectionNavigation structure */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i} className="h-full">
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									{/* Icon placeholder */}
									<Skeleton className="h-10 w-10 rounded-lg" />
									<div className="space-y-2">
										{/* Title */}
										<Skeleton className="h-5 w-24" />
										{/* Description */}
										<Skeleton className="h-4 w-40" />
									</div>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
