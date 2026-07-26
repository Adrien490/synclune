import { Item, ItemContent, ItemGroup } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

interface SkusMobileListSkeletonProps {
	hasActiveFilters?: boolean;
}

export function SkusMobileListSkeleton({ hasActiveFilters }: SkusMobileListSkeletonProps = {}) {
	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0">
			<div className="flex items-center justify-end">
				<Skeleton shape="rounded" className="h-11 w-32" />
			</div>
			{hasActiveFilters ? <Skeleton shape="rounded" className="h-12 w-full" /> : null}
			<SkeletonGroup label="Chargement des variantes">
				<ItemGroup>
					{Array.from({ length: 5 }).map((_, i) => (
						<li key={i}>
							<Item
								variant="outline"
								size="sm"
								className="gap-3"
								style={{ animationDelay: `${i * 100}ms` }}
							>
								<Skeleton shape="rounded" className="size-12 shrink-0" />
								<ItemContent>
									<div className="flex items-center gap-2">
										<Skeleton shape="text" className="h-5 w-24" />
										<Skeleton shape="rounded" className="h-5 w-12" />
									</div>
									<div className="flex items-center gap-2">
										<Skeleton shape="text" className="h-3 w-14" />
										<Skeleton shape="text" className="h-3 w-16" />
										<Skeleton shape="text" className="h-3 w-12" />
									</div>
								</ItemContent>
							</Item>
						</li>
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
