import { MessageSquare, CircleCheck, EyeOff, Star } from "lucide-react";

import { ReviewsDataTableSkeleton } from "@/modules/reviews/components/admin/reviews-data-table-skeleton";
import { ReviewsMobileListSkeleton } from "@/modules/reviews/components/admin/reviews-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ReviewsAdminLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des avis" className="space-y-6">
			<span className="sr-only">Chargement des avis…</span>

			<PageHeader variant="compact" title="Avis clients" className="hidden md:block" />

			<StickyActionBarSkeleton itemCount={3} />

			{/* Statistiques (4 cards : Total / Publiés / Masqués / Note moyenne) */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Total avis</p>
							<Skeleton className="mt-1 h-8 w-16" />
						</div>
						<MessageSquare className="text-muted-foreground size-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Publiés</p>
							<Skeleton className="mt-1 h-8 w-12" />
						</div>
						<CircleCheck className="text-secondary-foreground size-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Masqués</p>
							<Skeleton className="mt-1 h-8 w-12" />
						</div>
						<EyeOff className="text-muted-foreground size-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Note moyenne</p>
							<Skeleton className="mt-1 h-8 w-16" />
						</div>
						<Star className="text-muted-foreground size-8" />
					</div>
				</div>
			</div>

			<ToolbarSkeleton selectCount={4} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<ReviewsMobileListSkeleton />
			<ReviewsDataTableSkeleton />
		</div>
	);
}
