"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Ellipsis, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { useHaptic } from "@/shared/hooks/use-haptic";

import { DISCOUNT_STATUS_BADGE_CONFIG } from "../../../constants/discount.constants";
import { useDiscountActions } from "../../../hooks/use-discount-actions";
import { getDiscountStatus } from "../../../services/discount-validation.service";
import type { GetDiscountReturn } from "../../../types/discount.types";
import { useSetAdminPageTitle } from "@/app/admin/_components/admin-page-title-context";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface DiscountDetailHeaderProps {
	discount: NonNullable<GetDiscountReturn>;
}

export function DiscountDetailHeader({ discount }: DiscountDetailHeaderProps) {
	// Titre lisible pour le header mobile (sinon : id opaque Title-Casé).
	useSetAdminPageTitle(discount.code);
	const haptic = useHaptic();
	const status = DISCOUNT_STATUS_BADGE_CONFIG[getDiscountStatus(discount)];
	const { sections } = useDiscountActions({ discount });

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<h1
					className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl"
					style={{ viewTransitionName: `discount-code-${discount.id}` }}
				>
					<code className="bg-muted rounded px-2 py-1 font-mono text-lg sm:text-2xl lg:text-3xl">
						{discount.code}
					</code>
				</h1>
				<div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs md:hidden">
					<Badge
						variant={status.variant}
						className="shrink-0"
						style={{ viewTransitionName: `discount-status-${discount.id}` }}
					>
						{status.label}
					</Badge>
					<span aria-hidden="true">·</span>
					<span className="truncate">
						Créé {formatDistanceToNow(discount.createdAt, { addSuffix: true, locale: fr })}
					</span>
				</div>
				<p className="text-muted-foreground mt-1 hidden text-sm md:block">
					Créé le{" "}
					{format(discount.createdAt, "d MMMM yyyy 'à' HH'h'mm", {
						locale: fr,
					})}
					<span className="text-muted-foreground">
						{" "}
						(mis à jour {formatDistanceToNow(discount.updatedAt, { addSuffix: true, locale: fr })})
					</span>
				</p>
			</div>

			<DetailStickyActionBar>
				<Button
					render={
						<Link
							href={`/admin/marketing/discounts/${discount.id}/modifier`}
							onClick={() => haptic("light")}
						/>
					}
					size="sm"
					className="min-h-11 flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
				>
					<Pencil className="size-4" aria-hidden="true" />
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
						<Ellipsis className="size-4" aria-hidden="true" />
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title="Actions"
						description={discount.code}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
