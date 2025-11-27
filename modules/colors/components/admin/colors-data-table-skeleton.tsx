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

export function ColorsDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[5%]">
									<Skeleton className="h-4 w-4" />
								</TableHead>
								<TableHead className="hidden md:table-cell w-[10%]">
									Aperçu
								</TableHead>
								<TableHead className="w-[40%] sm:w-[30%]">Nom</TableHead>
								<TableHead className="hidden lg:table-cell w-[12%]">
									Hex
								</TableHead>
								<TableHead className="hidden sm:table-cell text-center w-[10%]">
									Variantes
								</TableHead>
								<TableHead className="w-[15%] sm:w-[10%] text-right">
									Actions
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
									{/* Color preview circle */}
									<TableCell className="hidden md:table-cell">
										<Skeleton className="h-[30px] w-[30px] rounded-full" />
									</TableCell>
									{/* Name */}
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									{/* Hex code */}
									<TableCell className="hidden lg:table-cell">
										<Skeleton className="h-4 w-20" />
									</TableCell>
									{/* SKUs count */}
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
