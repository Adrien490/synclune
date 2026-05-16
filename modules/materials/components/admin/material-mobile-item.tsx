"use client";

import { Gem, Loader2 } from "lucide-react";

import { MobileSelectableCard } from "@/shared/components/mobile-selection";
import { Badge } from "@/shared/components/ui/badge";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@/shared/components/ui/item";
import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
import { useAdminListPendingContextOptional } from "@/shared/contexts/admin-list-pending-context";
import { cn } from "@/shared/utils/cn";

import { useMaterialActions } from "../../hooks/use-material-actions";

interface MaterialMobileItemProps {
	material: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		isActive: boolean;
		_count: { skus: number };
	};
}

export function MaterialMobileItem({ material }: MaterialMobileItemProps) {
	const skuCount = material._count.skus;
	const statusLabel = material.isActive ? "● Actif" : "○ Inactif";
	const pendingCtx = useAdminListPendingContextOptional();
	const isPendingItem = pendingCtx?.isPending(material.id) ?? false;
	const pendingKind = pendingCtx?.pendingKind ?? null;
	const pendingLabel = isPendingItem ? ADMIN_PENDING_LABELS[pendingKind ?? "status"] : null;

	const { sections } = useMaterialActions({
		materialId: material.id,
		materialName: material.name,
		materialSlug: material.slug,
		materialDescription: material.description,
		materialIsActive: material.isActive,
	});

	return (
		<MobileSelectableCard
			id={material.id}
			itemLabel={`Matériau ${material.name}`}
			longPressProps={{
				href: `/admin/catalogue/materiaux/${material.slug}`,
				ariaLabel: `Matériau ${material.name}`,
				sections,
				menuTitle: "Actions",
				menuDescription: material.name,
				className: "text-left",
				viewTransitionName: `material-card-${material.id}`,
			}}
		>
			<Item
				variant="outline"
				size="sm"
				className={cn(
					"w-full gap-3 motion-safe:transition-opacity",
					isPendingItem && "opacity-60 dark:opacity-50",
				)}
				aria-roledescription="carte matériau"
				aria-busy={isPendingItem || undefined}
			>
				<ItemMedia variant="icon">
					<Gem
						className="text-muted-foreground size-5"
						aria-hidden="true"
						style={{ viewTransitionName: `material-icon-${material.id}` }}
					/>
				</ItemMedia>
				<ItemContent className="min-w-0">
					<ItemTitle className="w-full min-w-0">
						<span className="truncate font-semibold">{material.name}</span>
						{isPendingItem ? (
							<Badge
								variant="secondary"
								aria-live="polite"
								style={{ viewTransitionName: `material-status-${material.id}` }}
							>
								<Loader2 className="size-3 motion-safe:animate-spin" aria-hidden="true" />
								{pendingLabel}
							</Badge>
						) : (
							<Badge
								variant={material.isActive ? "default" : "secondary"}
								style={{ viewTransitionName: `material-status-${material.id}` }}
							>
								{statusLabel}
							</Badge>
						)}
					</ItemTitle>
					{material.description ? (
						<ItemDescription className="line-clamp-1">{material.description}</ItemDescription>
					) : null}
					<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span>
							{skuCount} variante{skuCount !== 1 ? "s" : ""}
						</span>
					</ItemDescription>
				</ItemContent>
			</Item>
		</MobileSelectableCard>
	);
}
