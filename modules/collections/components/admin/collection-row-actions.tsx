"use client";

import { DotsThreeVerticalIcon } from "@phosphor-icons/react/ssr";

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
	collectionActive: boolean;
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
				<DotsThreeVerticalIcon className="size-4" />
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions collection"
				description={props.collectionName}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
