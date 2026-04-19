"use client";

import { CircleCheck, CircleX, Clock } from "lucide-react";

import type { NewsletterStatus } from "@/app/generated/prisma/client";

import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";

import { NEWSLETTER_STATUS_LABELS } from "../../constants/newsletter-status.constants";
import { SUBSCRIBER_ITEM_DRAWER_ID, type SubscriberItemDrawerData } from "./subscriber-item-drawer";

interface SubscriberMobileItemProps {
	subscriber: {
		id: string;
		email: string;
		status: NewsletterStatus;
		subscribedAt: Date;
	};
}

export function SubscriberMobileItem({ subscriber }: SubscriberMobileItemProps) {
	const { open } = useDialog<SubscriberItemDrawerData>(SUBSCRIBER_ITEM_DRAWER_ID);

	const handleOpen = () => {
		open({ subscriber });
	};

	return (
		<button
			type="button"
			aria-label={`Abonné ${subscriber.email}`}
			onClick={handleOpen}
			className="focus-visible:ring-primary w-full rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte abonne"
			>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{subscriber.email}</span>
						{subscriber.status === "CONFIRMED" ? (
							<span className="inline-flex items-center gap-1 text-xs text-green-600">
								<CircleCheck className="size-3" aria-hidden="true" />
								{NEWSLETTER_STATUS_LABELS.CONFIRMED}
							</span>
						) : subscriber.status === "PENDING" ? (
							<span className="inline-flex items-center gap-1 text-xs text-yellow-700">
								<Clock className="size-3" aria-hidden="true" />
								{NEWSLETTER_STATUS_LABELS.PENDING}
							</span>
						) : (
							<span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
								<CircleX className="size-3" aria-hidden="true" />
								{NEWSLETTER_STATUS_LABELS.UNSUBSCRIBED}
							</span>
						)}
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>Inscrit le {formatDateShort(subscriber.subscribedAt)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
