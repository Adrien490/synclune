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

export function StripePaymentsDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				<div className="overflow-x-auto">
					<Table className="min-w-full table-fixed">
						<TableHeader>
							<TableRow>
								{/* Commande */}
								<TableHead className="w-[18%]">
									<Skeleton className="h-4 w-20" />
								</TableHead>
								{/* Client */}
								<TableHead className="w-[22%]">
									<Skeleton className="h-4 w-14" />
								</TableHead>
								{/* Montant */}
								<TableHead className="w-[12%] text-right">
									<Skeleton className="h-4 w-16 ml-auto" />
								</TableHead>
								{/* Statut */}
								<TableHead className="w-[14%] text-center">
									<Skeleton className="h-4 w-14 mx-auto" />
								</TableHead>
								{/* Payé le */}
								<TableHead className="hidden lg:table-cell w-[14%]">
									<Skeleton className="h-4 w-16" />
								</TableHead>
								{/* Stripe ID */}
								<TableHead className="hidden xl:table-cell w-[16%]">
									<Skeleton className="h-4 w-20" />
								</TableHead>
								{/* Actions */}
								<TableHead className="w-[8%] text-right">
									<Skeleton className="h-4 w-16 ml-auto" />
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									{/* Order number link */}
									<TableCell>
										<Skeleton className="h-4 w-24" />
									</TableCell>
									{/* Client name */}
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									{/* Amount */}
									<TableCell className="text-right">
										<Skeleton className="h-4 w-16 ml-auto" />
									</TableCell>
									{/* Status badge */}
									<TableCell className="text-center">
										<Skeleton className="h-6 w-20 mx-auto rounded-full" />
									</TableCell>
									{/* Paid date */}
									<TableCell className="hidden lg:table-cell">
										<Skeleton className="h-4 w-28" />
									</TableCell>
									{/* Stripe payment intent ID */}
									<TableCell className="hidden xl:table-cell">
										<Skeleton className="h-4 w-32" />
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
