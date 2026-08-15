"use client";

import { DotsThreeVerticalIcon } from "@phosphor-icons/react/ssr";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";

import { useVariantActions } from "../../hooks/use-variant-actions";

interface ProductVariantRowActionsProps {
	variantId: string;
	variantName: string;
	productSlug: string;
	/** Vrai si le VARIANT est le représentant du produit — rang 0 de (position asc, id asc). */
	isRepresentative?: boolean;
	active?: boolean;
	stock?: number;
	priceCents?: number;
}

export function ProductVariantRowActions(props: ProductVariantRowActionsProps) {
	const { sections } = useVariantActions(props);

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="size-11 p-0 transition-transform active:scale-95"
						aria-label="Actions pour cette variante"
					/>
				}
			>
				<DotsThreeVerticalIcon className="size-4" />
				<span className="sr-only">Ouvrir le menu d&apos;actions</span>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions variante"
				description={props.variantName}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
