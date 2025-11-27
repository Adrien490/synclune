import { CursorPagination } from "@/shared/components/cursor-pagination";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { GetSubscribersReturn } from "@/modules/newsletter/data/get-subscribers";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Mail, XCircle } from "lucide-react";

export interface SubscribersDataTableProps {
	subscribersPromise: Promise<GetSubscribersReturn>;
}

export async function SubscribersDataTable({
	subscribersPromise,
}: SubscribersDataTableProps) {
	const { subscribers, pagination } = await subscribersPromise;

	if (subscribers.length === 0) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Mail />
					</EmptyMedia>
					<EmptyTitle>Aucun abonné trouvé</EmptyTitle>
					<EmptyDescription>
						Aucun abonné ne correspond aux critères de recherche.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent className="p-0">
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des abonnés newsletter">
						<TableHeader>
							<TableRow>
								<TableHead scope="col" className="w-[50%] sm:w-[40%]">Email</TableHead>
								<TableHead scope="col" className="w-[25%] sm:w-[15%]">Statut</TableHead>
								<TableHead scope="col" className="hidden sm:table-cell w-[22.5%]">Date d'inscription</TableHead>
								<TableHead scope="col" className="hidden md:table-cell w-[22.5%]">Dernière mise à jour</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{subscribers.map((subscriber) => (
								<TableRow key={subscriber.id}>
									<TableCell className="font-medium">
										{subscriber.email}
									</TableCell>
									<TableCell>
										{subscriber.isActive ? (
											<span className="inline-flex items-center gap-1.5 text-sm text-secondary-foreground">
												<CheckCircle2 className="h-4 w-4" />
												Actif
											</span>
										) : (
											<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
												<XCircle className="h-4 w-4" />
												Inactif
											</span>
										)}
									</TableCell>
									<TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
										{format(
											new Date(subscriber.subscribedAt),
											"d MMM yyyy",
											{ locale: fr }
										)}
									</TableCell>
									<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
										{format(
											new Date(subscriber.updatedAt),
											"d MMM yyyy",
											{ locale: fr }
										)}
									</TableCell>
								</TableRow>
								))}
						</TableBody>
					</Table>
				</div>

				<div className="p-4 border-t">
					<CursorPagination
						perPage={subscribers.length}
						hasNextPage={pagination.hasNextPage}
						hasPreviousPage={pagination.hasPreviousPage}
						currentPageSize={subscribers.length}
						nextCursor={pagination.nextCursor}
						prevCursor={pagination.prevCursor}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
