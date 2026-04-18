"use client";

import { Item, ItemActions, ItemContent, ItemGroup } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";
import { useReducedMotion } from "motion/react";

export function DiscountsMobileListSkeleton() {
	const reduced = useReducedMotion();
	return (
		<div className="md:hidden">
			<SkeletonGroup label="Chargement des codes promo">
				<ItemGroup>
					{Array.from({ length: 5 }).map((_, i) => (
						<Item
							key={i}
							variant="outline"
							size="sm"
							className="gap-3"
							style={reduced ? undefined : { animationDelay: `${i * 100}ms` }}
						>
							<ItemContent>
								<div className="flex items-center gap-2">
									<Skeleton shape="rounded" className="h-5 w-24" />
									<Skeleton shape="rounded" className="h-5 w-14" />
								</div>
								<div className="flex items-center gap-2">
									<Skeleton shape="text" className="h-3 w-20" />
									<Skeleton shape="text" className="h-3 w-12" />
									<Skeleton shape="text" className="h-3 w-14" />
								</div>
							</ItemContent>
							<ItemActions>
								<Skeleton shape="rounded" className="size-8" />
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
