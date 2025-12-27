"use client";

import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le Product Filter Sheet
 * Affiche des accordions et checkboxes placeholder
 */
export function ProductFilterSheetSkeleton() {
	return (
		<SkeletonGroup
			label="Chargement des filtres"
			className="flex flex-col h-full"
		>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<Skeleton className="h-5 w-20" />
				<Skeleton className="size-8 rounded-md" />
			</div>

			{/* Accordions */}
			<div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
				{/* Section couleurs */}
				<AccordionSkeleton title={16} itemCount={6} itemType="swatch" />

				{/* Section materiaux */}
				<AccordionSkeleton title={20} itemCount={4} itemType="checkbox" />

				{/* Section types */}
				<AccordionSkeleton title={24} itemCount={5} itemType="checkbox" />

				{/* Section prix */}
				<div className="space-y-3 py-3 border-b">
					<Skeleton className="h-4 w-10" />
					<div className="flex items-center gap-3">
						<Skeleton className="h-10 flex-1 rounded-md" />
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-10 flex-1 rounded-md" />
					</div>
				</div>

				{/* Section note */}
				<div className="space-y-3 py-3">
					<Skeleton className="h-4 w-14" />
					<div className="flex gap-1">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="size-6" />
						))}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="flex items-center gap-3 p-4 border-t">
				<Skeleton className="h-10 flex-1 rounded-md" />
				<Skeleton className="h-10 flex-1 rounded-md" />
			</div>
		</SkeletonGroup>
	);
}

function AccordionSkeleton({
	title,
	itemCount,
	itemType,
}: {
	title: number;
	itemCount: number;
	itemType: "checkbox" | "swatch";
}) {
	return (
		<div className="space-y-3 py-3 border-b">
			<Skeleton className="h-4" style={{ width: title }} />
			<div className={itemType === "swatch" ? "flex flex-wrap gap-2" : "space-y-2"}>
				{Array.from({ length: itemCount }).map((_, i) =>
					itemType === "swatch" ? (
						<Skeleton key={i} className="size-8 rounded-full" />
					) : (
						<div key={i} className="flex items-center gap-2">
							<Skeleton className="size-4 rounded" />
							<Skeleton className="h-4 w-24" />
						</div>
					)
				)}
			</div>
		</div>
	);
}
