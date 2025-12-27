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
 * Skeleton de chargement pour le Size Guide Dialog
 * Affiche des tabs et une table de tailles placeholder
 */
export function SizeGuideDialogSkeleton() {
	return (
		<ResponsiveDialog open>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<SkeletonGroup label="Chargement du guide des tailles">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle asChild>
							<Skeleton className="h-6 w-36" />
						</ResponsiveDialogTitle>
						<ResponsiveDialogDescription asChild>
							<Skeleton className="h-4 w-64" />
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="py-4 space-y-4">
						{/* Tabs */}
						<div className="flex gap-2 border-b pb-2">
							{Array.from({ length: 3 }).map((_, i) => (
								<Skeleton key={i} className="h-8 w-20 rounded-md" />
							))}
						</div>

						{/* Table header */}
						<div className="grid grid-cols-4 gap-2 py-2 border-b">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-4" />
							))}
						</div>

						{/* Table rows */}
						{Array.from({ length: 4 }).map((_, rowIndex) => (
							<div key={rowIndex} className="grid grid-cols-4 gap-2 py-2">
								{Array.from({ length: 4 }).map((_, colIndex) => (
									<Skeleton key={colIndex} className="h-4" />
								))}
							</div>
						))}
					</div>
				</SkeletonGroup>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
