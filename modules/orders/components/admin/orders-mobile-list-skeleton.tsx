import { Item, ItemActions, ItemContent, ItemGroup } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

interface OrdersMobileListSkeletonProps {
	hasActiveFilters?: boolean;
}

export function OrdersMobileListSkeleton({ hasActiveFilters }: OrdersMobileListSkeletonProps = {}) {
	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0">
			<div className="flex items-center justify-end">
				<Skeleton shape="rounded" className="h-11 w-32" />
			</div>
			{hasActiveFilters ? <Skeleton shape="rounded" className="h-12 w-full" /> : null}
			<SkeletonGroup label="Chargement des commandes">
				<ItemGroup>
					{Array.from({ length: 5 }).map((_, i) => (
						<li key={i}>
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								style={{ animationDelay: `${i * 100}ms` }}
							>
								<ItemContent>
									<div className="flex items-center gap-2">
										<Skeleton shape="text" className="h-5 w-28" />
										<Skeleton shape="rounded" className="h-5 w-16" />
										<Skeleton shape="rounded" className="h-5 w-14" />
									</div>
									<div className="flex items-center gap-2">
										<Skeleton shape="text" className="h-3 w-24" />
										<Skeleton shape="text" className="h-3 w-12" />
										<Skeleton shape="text" className="h-3 w-16" />
										<Skeleton shape="text" className="h-3 w-14" />
									</div>
								</ItemContent>
								<ItemActions>
									<Skeleton shape="rounded" className="size-8" />
								</ItemActions>
							</Item>
						</li>
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
