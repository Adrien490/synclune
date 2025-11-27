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

export function UsersDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								{/* Avatar */}
								<TableHead className="w-[8%]">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Nom */}
								<TableHead className="w-[20%]">
									<Skeleton className="h-4 w-10" />
								</TableHead>
								{/* Email */}
								<TableHead className="w-[30%]">
									<Skeleton className="h-4 w-12" />
								</TableHead>
								{/* Commandes */}
								<TableHead className="hidden xl:table-cell w-[12%]">
									<Skeleton className="h-4 w-20" />
								</TableHead>
								{/* Inscription */}
								<TableHead className="hidden sm:table-cell w-[15%]">
									<Skeleton className="h-4 w-20" />
								</TableHead>
								{/* Actions */}
								<TableHead className="w-[5%] text-right">
									<Skeleton className="h-4 w-16 ml-auto" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									{/* Avatar */}
									<TableCell>
										<Skeleton className="h-10 w-10 rounded-full" />
									</TableCell>
									{/* Nom */}
									<TableCell>
										<Skeleton className="h-4 w-28" />
									</TableCell>
									{/* Email with icon */}
									<TableCell>
										<div className="flex items-center gap-2">
											<Skeleton className="h-4 w-32" />
											<Skeleton className="h-4 w-4 rounded-full shrink-0" />
										</div>
									</TableCell>
									{/* Commandes */}
									<TableCell className="hidden xl:table-cell">
										<Skeleton className="h-4 w-6" />
									</TableCell>
									{/* Inscription */}
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-4 w-20" />
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
