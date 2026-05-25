import { Item, ItemContent, ItemGroup, ItemMedia } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

interface ProductTypesMobileListSkeletonProps {
	hasActiveFilters?: boolean;
}

export function ProductTypesMobileListSkeleton({
	hasActiveFilters,
}: ProductTypesMobileListSkeletonProps = {}) {
	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<div className="flex items-center justify-end">
				<Skeleton shape="rounded" className="h-11 w-32" />
			</div>
			{hasActiveFilters ? <Skeleton shape="rounded" className="h-12 w-full" /> : null}
			<SkeletonGroup label="Chargement des types de bijoux">
				<ItemGroup>
					{Array.from({ length: 5 }).map((_, i) => (
						<Item
							key={i}
							variant="outline"
							size="sm"
							className="gap-3"
							style={{ animationDelay: `${i * 100}ms` }}
						>
							<ItemMedia variant="icon">
								<Skeleton shape="circle" className="size-8" />
							</ItemMedia>
							<ItemContent>
								<div className="flex items-center gap-2">
									<Skeleton shape="rounded" className="h-5 w-28" />
									<Skeleton shape="rounded" className="h-5 w-12" />
								</div>
								<Skeleton shape="text" className="h-3 w-36" />
								<Skeleton shape="text" className="h-3 w-20" />
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
