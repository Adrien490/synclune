import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination/cursor-pagination-skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";

export function SkusDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full">
						<TableHeader>
							<TableRow>
								{/* Select */}
								<TableHead className="w-12">
									<Skeleton className="h-4 w-4" />
								</TableHead>
								{/* Image */}
								<TableHead className="hidden md:table-cell w-20">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* SKU */}
								<TableHead>
									<Skeleton className="h-4 w-10" />
								</TableHead>
								{/* Couleur */}
								<TableHead className="hidden sm:table-cell">
									<Skeleton className="h-4 w-14" />
								</TableHead>
								{/* Matériau */}
								<TableHead className="hidden xl:table-cell">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Taille */}
								<TableHead className="hidden 2xl:table-cell">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Prix final */}
								<TableHead>
									<Skeleton className="h-4 w-14" />
								</TableHead>
								{/* Prix HT */}
								<TableHead className="hidden xl:table-cell">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Stock */}
								<TableHead className="hidden sm:table-cell text-center">
									<Skeleton className="h-4 w-12 mx-auto" />
								</TableHead>
								{/* Actions */}
								<TableHead className="text-right">
									<Skeleton className="h-4 w-14 ml-auto" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									{/* Select checkbox */}
									<TableCell>
										<Skeleton className="h-4 w-4" />
									</TableCell>
									{/* Image */}
									<TableCell className="hidden md:table-cell py-3">
										<Skeleton className="h-20 w-20 rounded-md" />
									</TableCell>
									{/* SKU */}
									<TableCell>
										<div className="flex flex-col gap-1">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-5 w-16 rounded-full" />
										</div>
									</TableCell>
									{/* Couleur */}
									<TableCell className="hidden sm:table-cell">
										<div className="flex items-center gap-2">
											<Skeleton className="h-4 w-4 rounded-full" />
											<Skeleton className="h-4 w-16" />
										</div>
									</TableCell>
									{/* Matériau */}
									<TableCell className="hidden xl:table-cell">
										<Skeleton className="h-4 w-20" />
									</TableCell>
									{/* Taille */}
									<TableCell className="hidden 2xl:table-cell">
										<Skeleton className="h-4 w-12" />
									</TableCell>
									{/* Prix final */}
									<TableCell>
										<Skeleton className="h-4 w-16" />
									</TableCell>
									{/* Prix HT */}
									<TableCell className="hidden xl:table-cell">
										<Skeleton className="h-4 w-14" />
									</TableCell>
									{/* Stock */}
									<TableCell className="hidden sm:table-cell text-center">
										<Skeleton className="h-4 w-8 mx-auto" />
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
				<div className="mt-4">
					<CursorPaginationSkeleton />
				</div>
			</CardContent>
		</Card>
	);
}
