import { use } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";

import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { Button } from "@/shared/components/ui/button";
import { ItemGroup } from "@/shared/components/ui/item";

import { type GetSubscribersReturn } from "@/modules/newsletter/data/get-subscribers";
import { SubscriberMobileItem } from "./subscriber-mobile-item";

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
			<ItemGroup aria-label="Abonnes newsletter" className="gap-2">
				{subscribers.map((subscriber) => (
					<div key={subscriber.id} role="listitem">
						<SubscriberMobileItem subscriber={subscriber} />
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
