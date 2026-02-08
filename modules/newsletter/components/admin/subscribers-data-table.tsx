import { NewsletterStatus } from "@/app/generated/prisma/client";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableScrollContainer } from "@/shared/components/table-scroll-container";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { GetSubscribersReturn } from "@/modules/newsletter/data/get-subscribers";
import { formatDateShort } from "@/shared/utils/dates";
import { CheckCircle2, Clock, Mail, XCircle } from "lucide-react";
import { NEWSLETTER_STATUS_LABELS } from "@/modules/newsletter/constants/newsletter-status.constants";
export interface SubscribersDataTableProps {
	subscribersPromise: Promise<GetSubscribersReturn>;
	perPage: number;
}

export async function SubscribersDataTable({
	subscribersPromise,
	perPage,
}: SubscribersDataTableProps) {
	const { subscribers, pagination } = await subscribersPromise;

	if (subscribers.length === 0) {
		return (
			<TableEmptyState
				icon={Mail}
				title="Aucun abonne trouve"
				description="Aucun abonne ne correspond aux criteres de recherche."
			/>
		);
	}

	return (
		<Card>
			<CardContent>
				<TableScrollContainer>
					<Table aria-label="Liste des abonnés newsletter" striped>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[35%]">Email</TableHead>
								<TableHead className="w-[20%]">Statut</TableHead>
								<TableHead className="hidden sm:table-cell w-[25%]">Date d'inscription</TableHead>
								<TableHead className="hidden md:table-cell w-[20%]">Dernière mise à jour</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{subscribers.map((subscriber) => (
								<TableRow key={subscriber.id}>
									<TableCell className="font-medium">
										<span>{subscriber.email}</span>
									</TableCell>
									<TableCell>
										{subscriber.status === NewsletterStatus.CONFIRMED ? (
											<span className="inline-flex items-center gap-1.5 text-sm text-green-600">
												<CheckCircle2 className="h-4 w-4" aria-hidden="true" />
												{NEWSLETTER_STATUS_LABELS[NewsletterStatus.CONFIRMED]}
											</span>
										) : subscriber.status === NewsletterStatus.PENDING ? (
											<span className="inline-flex items-center gap-1.5 text-sm text-yellow-600">
												<Clock className="h-4 w-4" aria-hidden="true" />
												{NEWSLETTER_STATUS_LABELS[NewsletterStatus.PENDING]}
											</span>
										) : (
											<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
												<XCircle className="h-4 w-4" aria-hidden="true" />
												{NEWSLETTER_STATUS_LABELS[NewsletterStatus.UNSUBSCRIBED]}
											</span>
										)}
									</TableCell>
									<TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
										{formatDateShort(subscriber.subscribedAt)}
									</TableCell>
									<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
										{formatDateShort(subscriber.updatedAt)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableScrollContainer>

				<div className="mt-4">
					<CursorPagination
						perPage={perPage}
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
