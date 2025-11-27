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

export function CollectionsDataTableSkeleton() {
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
								<TableHead className="hidden md:table-cell w-[12%]">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Nom */}
								<TableHead className="w-[50%] sm:w-[30%]">
									<Skeleton className="h-4 w-10" />
								</TableHead>
								{/* Description */}
								<TableHead className="hidden xl:table-cell w-[30%]">
									<Skeleton className="h-4 w-20" />
								</TableHead>
								{/* Produits */}
								<TableHead className="hidden sm:table-cell text-center w-[15%]">
									<Skeleton className="h-4 w-16 mx-auto" />
								</TableHead>
								{/* Actions */}
								<TableHead className="w-[20%] sm:w-[10%] text-right">
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
									{/* Name */}
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									{/* Description */}
									<TableCell className="hidden xl:table-cell">
										<Skeleton className="h-4 w-full" />
									</TableCell>
									{/* Products count */}
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
				<div className="mt-4 flex items-center justify-between">
					<Skeleton className="h-4 w-32" />
					<div className="flex gap-2">
						<Skeleton className="h-8 w-24" />
						<Skeleton className="h-8 w-24" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
