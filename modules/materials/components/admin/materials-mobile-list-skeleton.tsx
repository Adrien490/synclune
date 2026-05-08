import { Item, ItemContent, ItemGroup, ItemMedia } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

export function MaterialsMobileListSkeleton() {
	return (
		<div className="md:hidden">
			<SkeletonGroup label="Chargement des materiaux">
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
								<Skeleton shape="text" className="h-3 w-32" />
								<Skeleton shape="text" className="h-3 w-20" />
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
