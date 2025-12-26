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

/**
 * Skeleton de chargement pour la liste des avis admin
 */
export function ReviewsDataTableSkeleton() {
	return (
		<Card aria-busy="true" aria-label="Chargement des avis">
			<CardContent>
				<Table aria-hidden="true">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[25%]">Produit</TableHead>
							<TableHead className="w-[20%]">Client</TableHead>
							<TableHead className="w-[10%]">Note</TableHead>
							<TableHead className="w-[15%]">Statut</TableHead>
							<TableHead className="hidden md:table-cell w-[15%]">Date</TableHead>
							<TableHead className="w-[10%]">Réponse</TableHead>
							<TableHead className="w-[5%]">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 10 }).map((_, i) => (
							<TableRow key={i}>
								<TableCell>
									<Skeleton className="h-4 w-32" />
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<Skeleton className="size-8 rounded-full" />
										<div className="space-y-1">
											<Skeleton className="h-3 w-20" />
											<Skeleton className="h-3 w-28" />
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Skeleton className="h-4 w-16" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-16" />
								</TableCell>
								<TableCell className="hidden md:table-cell">
									<Skeleton className="h-4 w-20" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-14" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-8 w-8 ml-auto" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
