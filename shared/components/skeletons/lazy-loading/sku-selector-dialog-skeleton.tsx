"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Skeleton, SkeletonButton, SkeletonGroup } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le SKU Selector Dialog
 * Affiche une structure de dialog avec swatches placeholder
 */
export function SkuSelectorDialogSkeleton() {
	return (
		<ResponsiveDialog open>
			<ResponsiveDialogContent className="sm:max-w-lg">
				<SkeletonGroup label="Chargement du selecteur de variante">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle asChild>
							<Skeleton className="h-6 w-48" />
						</ResponsiveDialogTitle>
						<ResponsiveDialogDescription asChild>
							<Skeleton className="h-4 w-32" />
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="py-4 space-y-6">
						{/* Image produit */}
						<div className="flex justify-center">
							<Skeleton className="size-32 rounded-lg" />
						</div>

						{/* Section couleurs */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<div className="flex flex-wrap gap-2">
								{Array.from({ length: 5 }).map((_, i) => (
									<Skeleton key={i} className="size-10 rounded-full" />
								))}
							</div>
						</div>

						{/* Section materiaux */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<div className="flex flex-wrap gap-2">
								{Array.from({ length: 3 }).map((_, i) => (
									<Skeleton key={i} className="h-9 w-24 rounded-md" />
								))}
							</div>
						</div>

						{/* Section tailles */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-14" />
							<div className="flex flex-wrap gap-2">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="size-10 rounded-md" />
								))}
							</div>
						</div>

						{/* Quantite */}
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-16" />
							<div className="flex items-center gap-2">
								<Skeleton className="size-9 rounded-md" />
								<Skeleton className="h-6 w-8" />
								<Skeleton className="size-9 rounded-md" />
							</div>
						</div>
					</div>

					<ResponsiveDialogFooter>
						<SkeletonButton size="lg" className="w-full" />
					</ResponsiveDialogFooter>
				</SkeletonGroup>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
