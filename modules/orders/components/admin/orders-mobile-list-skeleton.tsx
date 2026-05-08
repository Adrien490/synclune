import { Item, ItemActions, ItemContent, ItemGroup } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

export function OrdersMobileListSkeleton() {
	return (
		<div className="pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<SkeletonGroup label="Chargement des commandes">
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
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
