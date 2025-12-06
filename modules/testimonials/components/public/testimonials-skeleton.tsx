import { Card, CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function TestimonialsSkeleton() {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{Array.from({ length: 3 }).map((_, index) => (
				<Card key={index} className="h-full border-0 bg-card/50">
					<CardContent className="p-6 flex flex-col h-full">
						{/* Quote icon */}
						<Skeleton className="h-8 w-8 mb-4" />

						{/* Content */}
						<div className="flex-1 space-y-2 mb-6">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>

						{/* Author */}
						<div className="flex items-center gap-3">
							<Skeleton className="h-10 w-10 rounded-full" />
							<Skeleton className="h-4 w-24" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
