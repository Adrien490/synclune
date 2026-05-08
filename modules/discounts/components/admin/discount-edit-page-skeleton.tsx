import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function DiscountEditPageSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
			{/* Mobile back link (mirror AdminDetailBackLink) */}
			<div className="md:hidden">
				<Skeleton className="h-5 w-44" />
			</div>

			<header className="space-y-2">
				<div className="space-y-1">
					<Skeleton className="h-8 w-72" />
					<Skeleton className="h-4 w-96 max-w-full" />
				</div>
			</header>

			<Separator />

			<div className="flex flex-col gap-6">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}
				<div className="flex justify-end">
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
		</div>
	);
}
