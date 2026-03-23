import { Item, ItemActions, ItemContent, ItemGroup } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

export function CustomizationsMobileListSkeleton() {
	return (
		<div className="md:hidden">
			<SkeletonGroup label="Chargement des demandes de personnalisation">
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
									<Skeleton shape="text" className="h-4 w-24" />
									<Skeleton shape="rounded" className="h-5 w-16" />
								</div>
								<div className="flex items-center gap-2">
									<Skeleton shape="text" className="h-3 w-32" />
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
