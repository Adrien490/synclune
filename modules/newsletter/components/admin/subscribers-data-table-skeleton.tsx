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

/**
 * Skeleton pour la table des abonnés newsletter
 * Reproduit exactement la structure de SubscribersDataTable pour éviter le CLS
 */
export function SubscribersDataTableSkeleton() {
	return (
		<Card>
			<CardContent>
				{/* Selection toolbar skeleton */}
				<div className="mb-4 h-10" />

				<div className="overflow-x-auto">
					<Table className="min-w-full">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[5%]">
									<Skeleton className="h-4 w-4" />
								</TableHead>
								<TableHead className="w-[35%] sm:w-[30%]">Email</TableHead>
								<TableHead className="w-[15%] sm:w-[15%]">Statut</TableHead>
								<TableHead className="hidden sm:table-cell w-[20%]">
									Date d'inscription
								</TableHead>
								<TableHead className="hidden md:table-cell w-[15%]">
									Dernière mise à jour
								</TableHead>
								<TableHead className="w-[10%] text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<TableRow key={i}>
									{/* Checkbox */}
									<TableCell>
										<Skeleton className="h-4 w-4" />
									</TableCell>
									{/* Email */}
									<TableCell>
										<Skeleton className="h-4 w-48" />
									</TableCell>
									{/* Status */}
									<TableCell>
										<div className="flex items-center gap-1.5">
											<Skeleton className="h-4 w-4 rounded-full" />
											<Skeleton className="h-4 w-16" />
										</div>
									</TableCell>
									{/* Date inscription */}
									<TableCell className="hidden sm:table-cell">
										<Skeleton className="h-4 w-24" />
									</TableCell>
									{/* Dernière mise à jour */}
									<TableCell className="hidden md:table-cell">
										<Skeleton className="h-4 w-24" />
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
