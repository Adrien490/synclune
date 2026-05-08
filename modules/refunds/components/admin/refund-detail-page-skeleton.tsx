import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function RefundDetailPageSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			{/* Mobile back link (mirror AdminDetailBackLink) */}
			<div className="md:hidden">
				<Skeleton className="h-5 w-44" />
			</div>

			<header className="space-y-2">
				<div className="space-y-1">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-4 w-48" />
				</div>
			</header>

			<Separator />

			<section className="space-y-3">
				{Array.from({ length: 7 }).map((_, i) => (
					<div key={i} className="grid grid-cols-[120px_1fr] items-center gap-4">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-full max-w-md" />
					</div>
				))}
			</section>

			<Separator />

			<section className="flex flex-col gap-2">
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</section>
		</div>
	);
}
