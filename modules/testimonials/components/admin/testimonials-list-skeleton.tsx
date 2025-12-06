import { Card, CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function TestimonialsListSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-4 w-24" />

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Card key={i} className="overflow-hidden">
						<CardContent className="p-4 space-y-3">
							<div className="flex items-start justify-between gap-2">
								<div className="space-y-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-16" />
								</div>
								<Skeleton className="h-5 w-16" />
							</div>

							<div className="space-y-1">
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-3 w-full" />
								<Skeleton className="h-3 w-2/3" />
							</div>

							<div className="flex items-center gap-2 pt-2">
								<Skeleton className="h-8 flex-1" />
								<Skeleton className="h-8 w-8" />
								<Skeleton className="h-8 w-8" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
