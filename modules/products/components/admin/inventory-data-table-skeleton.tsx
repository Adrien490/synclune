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

export function InventoryDataTableSkeleton() {
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
								{/* Produit */}
								<TableHead className="w-[35%] sm:w-[30%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Stock */}
								<TableHead className="w-[20%] sm:w-[13%] text-center">
									<Skeleton className="h-4 w-12 mx-auto" />
								</TableHead>
								{/* Actions */}
								<TableHead className="w-[20%] sm:w-[16%] text-right">
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
									{/* Product with type badge */}
									<TableCell>
										<div className="space-y-1">
											<Skeleton className="h-4 w-48" />
											<div className="flex gap-2">
												<Skeleton className="h-5 w-20 rounded-full" />
												<Skeleton className="h-5 w-16 rounded-full" />
											</div>
										</div>
									</TableCell>
									{/* Stock badge */}
									<TableCell className="text-center">
										<Skeleton className="h-6 w-16 mx-auto rounded-full" />
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
