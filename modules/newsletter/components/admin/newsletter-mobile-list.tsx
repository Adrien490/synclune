import { use } from "react";
import { NewsletterStatus } from "@/app/generated/prisma/client";
import { Mail, CircleCheck, Clock, CircleX } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Button } from "@/shared/components/ui/button";
import { formatDateShort } from "@/shared/utils/dates";
import { type GetSubscribersReturn } from "@/modules/newsletter/data/get-subscribers";
import { NEWSLETTER_STATUS_LABELS } from "@/modules/newsletter/constants/newsletter-status.constants";
import { SubscriberRowActions } from "./subscriber-row-actions";
import { NewsletterSelectionToolbar } from "./newsletter-selection-toolbar";
import Link from "next/link";

interface NewsletterMobileListProps {
	subscribersPromise: Promise<GetSubscribersReturn>;
	perPage: number;
}

export function NewsletterMobileList({ subscribersPromise, perPage }: NewsletterMobileListProps) {
	const { subscribers, pagination } = use(subscribersPromise);

	if (subscribers.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={Mail}
					title="Aucun abonne trouve"
					description="Aucun abonne ne correspond aux criteres de recherche."
					actionElement={
						<Button variant="outline" asChild>
							<Link href="/admin/marketing/newsletter">Reinitialiser la recherche</Link>
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<NewsletterSelectionToolbar />

			<ItemGroup aria-label="Abonnes newsletter" className="gap-2">
				{subscribers.map((subscriber) => (
					<div key={subscriber.id} role="listitem">
						<Item variant="outline" size="sm" className="gap-3" aria-roledescription="carte abonne">
							<ItemContent className="min-w-0">
								<ItemTitle>
									<span className="truncate font-semibold">{subscriber.email}</span>
									{subscriber.status === NewsletterStatus.CONFIRMED ? (
										<span className="inline-flex items-center gap-1 text-xs text-green-600">
											<CircleCheck className="size-3" aria-hidden="true" />
											{NEWSLETTER_STATUS_LABELS[NewsletterStatus.CONFIRMED]}
										</span>
									) : subscriber.status === NewsletterStatus.PENDING ? (
										<span className="inline-flex items-center gap-1 text-xs text-yellow-700">
											<Clock className="size-3" aria-hidden="true" />
											{NEWSLETTER_STATUS_LABELS[NewsletterStatus.PENDING]}
										</span>
									) : (
										<span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
											<CircleX className="size-3" aria-hidden="true" />
											{NEWSLETTER_STATUS_LABELS[NewsletterStatus.UNSUBSCRIBED]}
										</span>
									)}
								</ItemTitle>
								<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<span>Inscrit le {formatDateShort(subscriber.subscribedAt)}</span>
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<SubscriberRowActions
									subscriber={{
										id: subscriber.id,
										email: subscriber.email,
										status: subscriber.status,
									}}
								/>
							</ItemActions>
						</Item>
					</div>
				))}
			</ItemGroup>

			<CursorPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={subscribers.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
