import { Card, CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"

/**
 * Skeleton pour le layout Bento des témoignages
 *
 * Structure identique à TestimonialsBento :
 * - 1 grande carte featured à gauche
 * - 2 cartes compactes à droite
 */
export function TestimonialsSkeleton() {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
			{/* Featured skeleton - Grande carte */}
			<div className="lg:col-span-7">
				<Card className="h-full border-0 bg-card/50">
					<CardContent className="p-8 flex flex-col h-full min-h-[280px]">
						{/* Quote icon */}
						<Skeleton className="h-10 w-10 mb-6" />

						{/* Content - Plus de lignes pour la featured */}
						<div className="flex-1 space-y-3 mb-8">
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-full" />
							<Skeleton className="h-5 w-11/12" />
							<Skeleton className="h-5 w-3/4" />
						</div>

						{/* Author */}
						<div className="flex items-center gap-3 mt-auto">
							<Skeleton className="h-14 w-14 rounded-full" />
							<Skeleton className="h-5 w-28" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Stack skeleton - 3 cartes compactes (cohérent avec TestimonialsBento) */}
			<div className="lg:col-span-5 flex flex-col gap-4">
				{[0, 1, 2].map((index) => (
					<Card key={index} className="border-0 bg-card/50">
						<CardContent className="p-5 flex flex-col">
							{/* Quote icon */}
							<Skeleton className="h-7 w-7 mb-4" />

							{/* Content */}
							<div className="space-y-2 mb-5">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-2/3" />
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
		</div>
	)
}
