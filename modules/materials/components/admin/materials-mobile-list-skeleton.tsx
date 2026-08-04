import { Item, ItemContent, ItemGroup, ItemMedia } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

interface MaterialsMobileListSkeletonProps {
	hasActiveFilters?: boolean;
}

export function MaterialsMobileListSkeleton({
	hasActiveFilters,
}: MaterialsMobileListSkeletonProps = {}) {
	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0">
			<div className="flex items-center justify-end">
				<Skeleton shape="rounded" className="h-11 w-32" />
			</div>
			{hasActiveFilters ? <Skeleton shape="rounded" className="h-12 w-full" /> : null}
			<SkeletonGroup label="Chargement des materiaux">
				<ItemGroup>
					{Array.from({ length: 5 }).map((_, i) => (
						<li key={i}>
							<Item variant="outline" size="sm" className="gap-3">
								<ItemMedia variant="icon">
									<Skeleton shape="circle" className="size-8" />
								</ItemMedia>
								<ItemContent>
									<div className="flex items-center gap-2">
										<Skeleton shape="rounded" className="h-5 w-28" />
										<Skeleton shape="rounded" className="h-5 w-12" />
									</div>
									<Skeleton shape="text" className="h-3 w-32" />
									<Skeleton shape="text" className="h-3 w-20" />
								</ItemContent>
							</Item>
						</li>
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
