"use client";

import Link from "next/link";
import { Paperclip, StickyNote } from "lucide-react";
import { SwipeableCard } from "@/shared/components/swipeable-card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "@/shared/components/ui/item";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";
import { CustomizationRowActions } from "./customization-row-actions";
import { CustomizationStatusBadge } from "./customization-status-badge";
import { UPDATE_NOTES_DIALOG_ID } from "./update-notes-dialog";

type CustomizationRequest = {
	id: string;
	firstName: string;
	email: string;
	status: Parameters<typeof CustomizationStatusBadge>[0]["status"];
	adminNotes: string | null;
	productTypeLabel: string;
	createdAt: Date | string;
	_count: { inspirationProducts: number };
};

/**
 * Mobile item pour les demandes de personnalisation avec swipe actions.
 * - Swipe droit (→) : ouvre le dialog d'édition des notes internes (safe).
 * - Équivalent clavier : CustomizationRowActions expose la même action.
 */
export function CustomizationsMobileListItem({ request }: { request: CustomizationRequest }) {
	const notesDialog = useDialog(UPDATE_NOTES_DIALOG_ID);

	const openNotes = () => {
		notesDialog.open({
			requestId: request.id,
			clientName: request.firstName,
			currentNotes: request.adminNotes,
		});
	};

	return (
		<SwipeableCard
			className="rounded-lg"
			rightAction={{
				children: <StickyNote className="text-secondary-foreground size-5" aria-hidden="true" />,
				label: `Éditer les notes de ${request.firstName}`,
				className: "bg-secondary",
				onAction: openNotes,
			}}
		>
			<Item variant="outline" size="sm" className="gap-3" aria-roledescription="carte demande">
				<ItemContent className="min-w-0">
					<ItemTitle>
						<Link
							href={`/admin/marketing/personnalisations/${request.id}`}
							className="truncate hover:underline"
							aria-label={`Voir la demande de ${request.firstName}`}
						>
							{request.firstName}
						</Link>
						<CustomizationStatusBadge status={request.status} />
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="truncate">{request.email}</span>
						<span aria-hidden="true">·</span>
						<span>{request.productTypeLabel}</span>
						{request._count.inspirationProducts > 0 && (
							<>
								<span aria-hidden="true">·</span>
								<span className="inline-flex items-center gap-0.5">
									<Paperclip className="size-3" aria-hidden="true" />
									{request._count.inspirationProducts}
								</span>
							</>
						)}
						{request.adminNotes && (
							<StickyNote className="text-primary size-3" aria-label="Notes internes" />
						)}
						<span aria-hidden="true">·</span>
						<span>{formatDateShort(request.createdAt)}</span>
					</ItemDescription>
				</ItemContent>
				<ItemActions>
					<CustomizationRowActions
						request={{
							id: request.id,
							firstName: request.firstName,
							email: request.email,
							status: request.status,
							adminNotes: request.adminNotes,
						}}
					/>
				</ItemActions>
			</Item>
		</SwipeableCard>
	);
}
