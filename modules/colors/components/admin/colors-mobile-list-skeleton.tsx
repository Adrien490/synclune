import { Item, ItemContent, ItemGroup, ItemMedia } from "@/shared/components/ui/item";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

export function ColorsMobileListSkeleton() {
	return (
		<div className="md:hidden">
			<SkeletonGroup label="Chargement des couleurs">
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
									<Skeleton shape="rounded" className="h-5 w-24" />
									<Skeleton shape="rounded" className="h-5 w-12" />
								</div>
								<div className="flex items-center gap-2">
									<Skeleton shape="text" className="h-3 w-16" />
									<Skeleton shape="text" className="h-3 w-20" />
								</div>
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			</SkeletonGroup>
		</div>
	);
}
