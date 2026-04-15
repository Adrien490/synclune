import { Item, ItemActions, ItemContent, ItemGroup } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

export function ProductsMobileListSkeleton() {
	return (
		<div className="md:hidden">
			<SkeletonGroup label="Chargement des produits">
				<ItemGroup>
					{Array.from({ length: 5 }).map((_, i) => (
						<Item
							key={i}
							variant="outline"
							size="sm"
							className="gap-3"
							style={{ animationDelay: `${i * 100}ms` }}
						>
							{/* Image placeholder */}
							<Skeleton shape="rounded" className="size-12 shrink-0" />

							<ItemContent>
								<div className="flex items-center gap-2">
									<Skeleton shape="text" className="h-5 w-32" />
									<Skeleton shape="rounded" className="h-5 w-16" />
								</div>
								<div className="flex items-center gap-2">
									<Skeleton shape="text" className="h-3 w-16" />
									<Skeleton shape="text" className="h-3 w-20" />
									<Skeleton shape="text" className="h-3 w-18" />
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
