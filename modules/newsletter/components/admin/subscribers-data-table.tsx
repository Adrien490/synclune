import { NewsletterStatus } from "@/app/generated/prisma/client";
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
import { CheckCircle2, Clock, Mail, XCircle } from "lucide-react";
import { NEWSLETTER_STATUS_LABELS } from "@/modules/newsletter/constants/newsletter-status.constants";
import { ViewTransition } from "react";
import { SubscriberRowActions } from "./subscriber-row-actions";
import { SubscribersSelectionToolbar } from "./subscribers-selection-toolbar";
import { SubscribersTableSelectionCell } from "./subscribers-table-selection-cell";

export interface SubscribersDataTableProps {
	subscribersPromise: Promise<GetSubscribersReturn>;
}

export async function SubscribersDataTable({
	subscribersPromise,
}: SubscribersDataTableProps) {
	const { subscribers, pagination } = await subscribersPromise;
	const subscriberIds = subscribers.map((s) => s.id);

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
			<CardContent>
				<SubscribersSelectionToolbar subscriberIds={subscriberIds} />
				<div className="overflow-x-auto">
					<Table role="table" aria-label="Liste des abonnés newsletter">
						<TableHeader>
							<TableRow>
								<TableHead scope="col" className="w-[5%]">
									<SubscribersTableSelectionCell type="header" subscriberIds={subscriberIds} />
								</TableHead>
								<TableHead scope="col" className="w-[35%] sm:w-[30%]">Email</TableHead>
								<TableHead scope="col" className="w-[15%] sm:w-[15%]">Statut</TableHead>
								<TableHead scope="col" className="hidden sm:table-cell w-[20%]">Date d'inscription</TableHead>
								<TableHead scope="col" className="hidden md:table-cell w-[15%]">Dernière mise à jour</TableHead>
								<TableHead scope="col" className="w-[10%] text-right" aria-label="Actions disponibles pour chaque abonné">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
								{subscribers.map((subscriber) => (
								<TableRow key={subscriber.id}>
									<TableCell>
										<SubscribersTableSelectionCell type="row" subscriberId={subscriber.id} />
									</TableCell>
									<TableCell className="font-medium">
										<ViewTransition name={`admin-subscriber-${subscriber.id}`}>
											<span>{subscriber.email}</span>
										</ViewTransition>
									</TableCell>
									<TableCell>
										{subscriber.status === NewsletterStatus.CONFIRMED ? (
											<span className="inline-flex items-center gap-1.5 text-sm text-green-600">
												<CheckCircle2 className="h-4 w-4" />
												{NEWSLETTER_STATUS_LABELS[NewsletterStatus.CONFIRMED]}
											</span>
										) : subscriber.status === NewsletterStatus.PENDING ? (
											<span className="inline-flex items-center gap-1.5 text-sm text-yellow-600">
												<Clock className="h-4 w-4" />
												{NEWSLETTER_STATUS_LABELS[NewsletterStatus.PENDING]}
											</span>
										) : (
											<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
												<XCircle className="h-4 w-4" />
												{NEWSLETTER_STATUS_LABELS[NewsletterStatus.UNSUBSCRIBED]}
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
									<TableCell className="text-right">
										<SubscriberRowActions
											subscriber={{
												id: subscriber.id,
												email: subscriber.email,
												status: subscriber.status,
												confirmedAt: subscriber.confirmedAt,
											}}
										/>
									</TableCell>
								</TableRow>
								))}
						</TableBody>
					</Table>
				</div>

				<div className="mt-4">
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
