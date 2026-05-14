import { Skeleton } from "@/shared/components/ui/skeleton";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";

export function HeroReassuranceBannerSkeleton() {
	return (
		<section aria-hidden="true" className="bg-muted/15 border-border/40 hidden border-y md:block">
			<div className={CONTAINER_CLASS}>
				<ul className="grid grid-cols-2 gap-x-3 gap-y-4 py-5 sm:py-6 md:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<li key={index} className="flex items-start gap-3">
							<Skeleton className="bg-muted/40 size-5 shrink-0 rounded" />
							<div className="min-w-0 flex-1 space-y-1.5">
								<Skeleton className="bg-muted/40 h-3.5 w-24 rounded" />
								<Skeleton className="bg-muted/30 h-3 w-32 rounded" />
							</div>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
