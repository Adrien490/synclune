"use client";

import { DotsThreeIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { collectionStatusLabel } from "@/modules/collections/constants/collection-status.constants";
import { useCollectionActions } from "@/modules/collections/hooks/use-collection-actions";
import type { GetCollectionReturn } from "@/modules/collections/types/collection.types";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface CollectionDetailHeaderProps {
	collection: GetCollectionReturn;
}

export function CollectionDetailHeader({ collection }: CollectionDetailHeaderProps) {
	const haptic = useHaptic();
	const { sections } = useCollectionActions({
		collectionId: collection.id,
		collectionName: collection.name,
		collectionSlug: collection.slug,
		collectionDescription: collection.description,
		collectionActive: collection.active,
		productsCount: collection.products.length,
	});

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<h1 className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
					{collection.name}
				</h1>
				<div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
					<Badge
						variant={collection.active ? "default" : "secondary"}
						className="shrink-0"
						style={{ viewTransitionName: `collection-status-${collection.id}` }}
					>
						{collectionStatusLabel(collection.active)}
					</Badge>
				</div>
			</div>

			<DetailStickyActionBar>
				<Button
					render={
						<Link
							href={`/admin/catalogue/collections/${collection.slug}/modifier`}
							onClick={() => haptic("light")}
						/>
					}
					size="sm"
					className="min-h-11 flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
				>
					<PencilSimpleIcon className="size-4" aria-hidden="true" />
					Modifier
				</Button>

				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger
						render={
							<Button
								variant="outline"
								size="sm"
								aria-label="Plus d'actions"
								className="min-h-11 min-w-11 touch-manipulation sm:min-h-9 sm:min-w-9"
							/>
						}
					>
						<DotsThreeIcon className="size-4" aria-hidden="true" />
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions collection"
						description={collection.name}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
