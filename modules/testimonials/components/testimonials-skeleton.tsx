import { Card, CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

interface TestimonialsSkeletonProps {
	/** Nombre de témoignages attendus (1, 2, 3, ou 4+). Défaut: 4 */
	count?: number
}

/** Skeleton pour une carte featured */
function FeaturedCardSkeleton() {
	return (
		<Card className="h-full border-0 bg-card/50">
			<CardContent className="p-8 flex flex-col h-full min-h-[280px]">
				<Skeleton className="h-10 w-10 mb-6" />
				<div className="flex-1 space-y-3 mb-8">
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-5 w-full" />
					<Skeleton className="h-5 w-11/12" />
					<Skeleton className="h-5 w-3/4" />
				</div>
				<div className="flex items-center gap-3 mt-auto">
					<Skeleton className="h-14 w-14 rounded-full" />
					<Skeleton className="h-5 w-28" />
				</div>
			</CardContent>
		</Card>
	)
}

/** Skeleton pour une carte compacte */
function CompactCardSkeleton() {
	return (
		<Card className="border-0 bg-card/50">
			<CardContent className="p-5 flex flex-col">
				<Skeleton className="h-7 w-7 mb-4" />
				<div className="space-y-2 mb-5">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</div>
				<div className="flex items-center gap-3">
					<Skeleton className="h-10 w-10 rounded-full" />
					<Skeleton className="h-4 w-24" />
				</div>
			</CardContent>
		</Card>
	)
}

/**
 * Skeleton pour le layout Bento des témoignages
 *
 * Adapte le layout selon le nombre de témoignages attendus :
 * - 1 : pleine largeur
 * - 2 : 50/50
 * - 3 : 1 featured + 2 en ligne
 * - 4+ : bento asymétrique (7/12 + 5/12)
 */
export function TestimonialsSkeleton({ count = 4 }: TestimonialsSkeletonProps) {
	// 1 témoignage → pleine largeur
	if (count === 1) {
		return <FeaturedCardSkeleton />
	}

	// 2 témoignages → layout équilibré 50/50
	if (count === 2) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
				<FeaturedCardSkeleton />
				<FeaturedCardSkeleton />
			</div>
		)
	}

	// 3 témoignages → 1 featured + 2 en ligne dessous
	if (count === 3) {
		return (
			<div className="flex flex-col gap-4 md:gap-5 lg:gap-6">
				<FeaturedCardSkeleton />
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
					<CompactCardSkeleton />
					<CompactCardSkeleton />
				</div>
			</div>
		)
	}

	// 4+ témoignages → layout bento asymétrique (7/12 + 5/12)
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-5 lg:gap-6">
			<div className="md:col-span-1 lg:col-span-7">
				<FeaturedCardSkeleton />
			</div>
			<div className="md:col-span-1 lg:col-span-5 flex flex-col gap-4 md:gap-5">
				<CompactCardSkeleton />
				<CompactCardSkeleton />
				<CompactCardSkeleton />
			</div>
		</div>
	)
}
