import { Card, CardContent } from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table"

export function TestimonialsDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								{/* Select */}
								<TableHead className="w-[5%]">
									<Skeleton className="h-4 w-4" />
								</TableHead>
								{/* Image */}
								<TableHead className="w-[10%]">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Auteur */}
								<TableHead className="w-[20%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Contenu */}
								<TableHead className="hidden sm:table-cell w-[40%]">
									<Skeleton className="h-4 w-20" />
								</TableHead>
								{/* Statut */}
								<TableHead className="w-[15%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Actions */}
								<TableHead className="w-[10%] text-right">
									<Skeleton className="h-4 w-16 ml-auto" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[...Array(5)].map((_, rowIndex) => (
								<TableRow key={rowIndex}>
									{/* Select checkbox */}
									<TableCell>
										<Skeleton className="h-4 w-4" />
									</TableCell>
									{/* Image thumbnail */}
									<TableCell>
										<Skeleton className="h-10 w-10 rounded" />
									</TableCell>
									{/* Auteur + date */}
									<TableCell>
										<div className="space-y-1">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-3 w-16" />
										</div>
									</TableCell>
									{/* Contenu */}
									<TableCell className="hidden sm:table-cell">
										<div className="space-y-1">
											<Skeleton className="h-4 w-full max-w-[300px]" />
											<Skeleton className="h-4 w-3/4 max-w-[225px]" />
										</div>
									</TableCell>
									{/* Statut badge */}
									<TableCell>
										<Skeleton className="h-6 w-20" />
									</TableCell>
									{/* Actions */}
									<TableCell className="text-right">
										<Skeleton className="h-8 w-8 ml-auto" />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				{/* Pagination skeleton */}
				<div className="mt-4 flex items-center justify-between">
					<Skeleton className="h-4 w-32" />
					<div className="flex gap-2">
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
