"use client";

import { EllipsisVertical } from "lucide-react";

import type { CollectionStatus } from "@/app/generated/prisma/enums";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useCollectionActions } from "../../hooks/use-collection-actions";

interface CollectionRowActionsProps {
	collectionId: string;
	collectionName: string;
	collectionSlug: string;
	collectionDescription: string | null;
	collectionStatus: CollectionStatus;
	productsCount: number;
}

export function CollectionRowActions(props: CollectionRowActionsProps) {
	const { sections } = useCollectionActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 transition-transform active:scale-95"
						aria-label="Actions pour cette collection"
					/>
				}
			>
				<span className="sr-only">Ouvrir le menu d&apos;actions</span>
				<EllipsisVertical className="size-4" />
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions collection"
				description={props.collectionName}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
