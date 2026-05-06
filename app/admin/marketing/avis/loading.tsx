import { MessageSquare, CircleCheck, EyeOff, Star } from "lucide-react";

import { ReviewsMobileListSkeleton } from "@/modules/reviews/components/admin/reviews-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page admin des avis.
 * Aligned with page.tsx: PageHeader + 4 stat cards + Toolbar + MobileList + DataTable.
 */
export default function ReviewsAdminLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des avis">
			<span className="sr-only">Chargement des avis...</span>

			<PageHeader variant="compact" title="Avis clients" className="hidden md:block" />

			{/* Statistiques (4 cards : Total / Publiés / Masqués / Note moyenne) */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Total avis</p>
							<Skeleton className="mt-1 h-8 w-16 motion-safe:animate-pulse" />
						</div>
						<MessageSquare className="text-muted-foreground h-8 w-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Publiés</p>
							<Skeleton className="mt-1 h-8 w-12 motion-safe:animate-pulse" />
						</div>
						<CircleCheck className="text-secondary-foreground h-8 w-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Masqués</p>
							<Skeleton className="mt-1 h-8 w-12 motion-safe:animate-pulse" />
						</div>
						<EyeOff className="text-muted-foreground h-8 w-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Note moyenne</p>
							<Skeleton className="mt-1 h-8 w-16 motion-safe:animate-pulse" />
						</div>
						<Star className="text-muted-foreground h-8 w-8" />
					</div>
				</div>
			</div>

			{/* Toolbar */}
			<ToolbarSkeleton selectCount={3} buttonCount={1} className="my-6" />

			{/* Mobile list */}
			<ReviewsMobileListSkeleton />

			{/* DataTable skeleton (desktop) */}
			<div className="hidden rounded-md border md:block">
				{/* Table Header */}
				<div className="bg-muted/50 border-b p-4">
					<div className="flex items-center gap-4">
						<Skeleton className="h-4 w-4" />
						<div className="flex-1">
							<Skeleton className="h-4 w-20" />
						</div>
						<div className="hidden w-24 md:block">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="hidden w-32 lg:block">
							<Skeleton className="h-4 w-24" />
						</div>
						<div className="w-20">
							<Skeleton className="h-4 w-12" />
						</div>
						<div className="w-24">
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="w-20">
							<Skeleton className="h-4 w-16" />
						</div>
					</div>
				</div>

				{/* Table Rows */}
				<div className="divide-y">
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="p-4">
							<div className="flex items-center gap-4">
								<Skeleton className="h-4 w-4" />
								<div className="flex-1 space-y-1">
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-3 w-32" />
								</div>
								<div className="hidden w-24 md:block">
									<Skeleton className="h-4 w-20" />
								</div>
								<div className="hidden w-32 lg:block">
									<Skeleton className="h-4 w-24" />
								</div>
								<div className="w-20">
									<Skeleton className="h-4 w-12" />
								</div>
								<div className="w-24">
									<Skeleton className="h-6 w-16 rounded-full" />
								</div>
								<div className="w-20">
									<Skeleton className="h-8 w-8 rounded-md" />
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Pagination */}
				<div className="border-t p-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-40 motion-safe:animate-pulse" />
						<div className="flex items-center gap-2">
							<Skeleton className="h-9 w-24 motion-safe:animate-pulse" />
							<Skeleton className="h-9 w-24 motion-safe:animate-pulse" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
