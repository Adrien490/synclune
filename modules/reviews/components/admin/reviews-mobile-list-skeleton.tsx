import { Item, ItemActions, ItemContent, ItemGroup } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

interface ReviewsMobileListSkeletonProps {
	hasActiveFilters?: boolean;
}

export function ReviewsMobileListSkeleton({
	hasActiveFilters,
}: ReviewsMobileListSkeletonProps = {}) {
	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<div className="flex items-center justify-end">
				<Skeleton shape="rounded" className="h-11 w-32" />
			</div>
			{hasActiveFilters ? <Skeleton shape="rounded" className="h-12 w-full" /> : null}
			<SkeletonGroup label="Chargement des avis">
				<ItemGroup>
					{Array.from({ length: 5 }).map((_, i) => (
						<Item
							key={i}
							variant="outline"
							size="sm"
							className="gap-3"
							style={{ animationDelay: `${i * 100}ms` }}
						>
							<ItemContent>
								<div className="flex items-center gap-2">
									<Skeleton shape="rounded" className="h-5 w-28" />
									<Skeleton shape="rounded" className="h-5 w-14" />
								</div>
								<div className="flex items-center gap-2">
									<Skeleton shape="text" className="h-3 w-16" />
									<Skeleton shape="text" className="h-3 w-20" />
									<Skeleton shape="text" className="h-3 w-16" />
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
