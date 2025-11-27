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

export function ProductsDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								{/* Select */}
								<TableHead className="w-[8%] sm:w-[5%]">
									<Skeleton className="h-4 w-4" />
								</TableHead>
								{/* Image */}
								<TableHead className="hidden md:table-cell w-[10%]">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Titre */}
								<TableHead className="w-[80%] sm:w-[45%] md:w-[35%] lg:w-[25%]">
									<Skeleton className="h-4 w-10" />
								</TableHead>
								{/* Type */}
								<TableHead className="hidden lg:table-cell w-[12%]">
									<Skeleton className="h-4 w-10" />
								</TableHead>
								{/* Variantes */}
								<TableHead className="hidden sm:table-cell text-center w-[10%] lg:w-[8%]">
									<Skeleton className="h-4 w-16 mx-auto" />
								</TableHead>
								{/* Prix */}
								<TableHead className="hidden lg:table-cell w-[12%] text-right">
									<Skeleton className="h-4 w-10 ml-auto" />
								</TableHead>
								{/* Stock */}
								<TableHead className="hidden lg:table-cell text-center w-[8%]">
									<Skeleton className="h-4 w-12 mx-auto" />
								</TableHead>
								{/* Actions */}
								<TableHead className="w-[12%] sm:w-[10%]">
									<Skeleton className="h-4 w-16 ml-auto" />
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
									{/* Title */}
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									{/* Type badge */}
									<TableCell className="hidden lg:table-cell">
										<Skeleton className="h-6 w-20 rounded-full" />
									</TableCell>
									{/* Variants count */}
									<TableCell className="hidden sm:table-cell text-center">
										<Skeleton className="h-4 w-8 mx-auto" />
									</TableCell>
									{/* Price */}
									<TableCell className="hidden lg:table-cell text-right">
										<Skeleton className="h-4 w-24 ml-auto" />
									</TableCell>
									{/* Stock */}
									<TableCell className="hidden lg:table-cell text-center">
										<Skeleton className="h-6 w-12 mx-auto rounded-full" />
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
