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

export function OrdersDataTableSkeleton() {
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
								{/* Numéro */}
								<TableHead className="w-[20%] sm:w-[10%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Date */}
								<TableHead className="hidden sm:table-cell w-[10%]">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Client */}
								<TableHead className="w-[25%] sm:w-[15%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Status */}
								<TableHead className="hidden sm:table-cell w-[10%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Paiement */}
								<TableHead className="hidden lg:table-cell w-[10%]">
									<Skeleton className="h-4 w-20" />
								</TableHead>
								{/* Montant */}
								<TableHead className="w-[15%] sm:w-[8%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Actions */}
								<TableHead className="w-[15%] sm:w-[10%] text-right">
									<Skeleton className="h-4 w-16 ml-auto" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[...Array(10)].map((_, rowIndex) => (
								<TableRow key={rowIndex}>
									{/* Select checkbox */}
									<TableCell>
										<Skeleton className="h-4 w-4" />
									</TableCell>
									{/* Order number */}
									<TableCell>
										<Skeleton className="h-4 w-20" />
									</TableCell>
									{/* Date */}
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-4 w-28" />
									</TableCell>
									{/* Client with avatar */}
									<TableCell>
										<div className="flex items-center gap-2">
											<Skeleton className="h-8 w-8 rounded-full" />
											<Skeleton className="h-4 w-24" />
										</div>
									</TableCell>
									{/* Status badge */}
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-6 w-20" />
									</TableCell>
									{/* Payment status badge */}
									<TableCell className="hidden lg:table-cell">
										<Skeleton className="h-6 w-20" />
									</TableCell>
									{/* Total */}
									<TableCell>
										<Skeleton className="h-4 w-16" />
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
