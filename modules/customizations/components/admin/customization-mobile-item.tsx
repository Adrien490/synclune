"use client";

import { Paperclip, StickyNote } from "lucide-react";

import { Item, ItemContent, ItemDescription, ItemTitle } from "@/shared/components/ui/item";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";

import type { CustomizationRequestStatus } from "../../types/customization.types";
import { CustomizationStatusBadge } from "./customization-status-badge";
import {
	CUSTOMIZATION_ITEM_DRAWER_ID,
	type CustomizationItemDrawerData,
} from "./customization-item-drawer";

interface CustomizationMobileItemProps {
	request: {
		id: string;
		firstName: string;
		email: string;
		status: CustomizationRequestStatus;
		adminNotes: string | null;
		productTypeLabel: string;
		createdAt: Date;
		_count: { inspirationProducts: number };
	};
}

export function CustomizationMobileItem({ request }: CustomizationMobileItemProps) {
	const { open } = useDialog<CustomizationItemDrawerData>(CUSTOMIZATION_ITEM_DRAWER_ID);
	const haptic = useHaptic();
	const inspirationCount = request._count.inspirationProducts;

	const handleOpen = () => {
		haptic("selection");
		open({
			request: {
				id: request.id,
				firstName: request.firstName,
				email: request.email,
				status: request.status,
				adminNotes: request.adminNotes,
				productTypeLabel: request.productTypeLabel,
				inspirationCount,
				createdAt: request.createdAt,
			},
		});
	};

	return (
		<button
			type="button"
			onClick={handleOpen}
			className="focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md text-left outline-none focus-visible:ring-[3px]"
			aria-label={`Ouvrir la demande de ${request.firstName}`}
		>
			<Item
				variant="outline"
				size="sm"
				className="w-full gap-3"
				aria-roledescription="carte demande"
			>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate">{request.firstName}</span>
						<CustomizationStatusBadge status={request.status} />
					</ItemTitle>
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="truncate">{request.email}</span>
						<span aria-hidden="true">·</span>
						<span>{request.productTypeLabel}</span>
						{inspirationCount > 0 ? (
							<>
								<span aria-hidden="true">·</span>
								<span className="inline-flex items-center gap-0.5">
									<Paperclip className="size-3" aria-hidden="true" />
									{inspirationCount}
								</span>
							</>
						) : null}
						{request.adminNotes ? (
							<StickyNote className="text-primary size-3" aria-label="Notes internes" />
						) : null}
						<span aria-hidden="true">·</span>
						<span>{formatDateShort(request.createdAt)}</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</button>
	);
}
