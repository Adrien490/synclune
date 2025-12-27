"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour les dialogs admin avec tables/listes
 * Utilisable pour ManageCollectionsDialog, DiscountUsagesDialog, etc.
 */
export function AdminDialogSkeleton() {
	return (
		<ResponsiveDialog open>
			<ResponsiveDialogContent className="sm:max-w-xl">
				<SkeletonGroup label="Chargement du contenu">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle asChild>
							<Skeleton className="h-6 w-40" />
						</ResponsiveDialogTitle>
						<ResponsiveDialogDescription asChild>
							<Skeleton className="h-4 w-56" />
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="py-4 space-y-3">
						{/* Table header */}
						<div className="grid grid-cols-3 gap-4 py-2 border-b">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
						</div>

						{/* Table rows */}
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="grid grid-cols-3 gap-4 py-2 items-center">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-8 w-20 rounded-md" />
							</div>
						))}
					</div>
				</SkeletonGroup>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
