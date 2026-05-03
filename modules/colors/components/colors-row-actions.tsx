"use client";

import { Copy, EllipsisVertical, ExternalLink, SquarePen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { DELETE_COLOR_DIALOG_ID } from "@/modules/colors/components/admin/delete-color-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useDuplicateColor } from "@/modules/colors/hooks/use-duplicate-color";

import { COLOR_DIALOG_ID } from "./color-form-dialog";

interface ColorsRowActionsProps {
	colorId: string;
	colorName: string;
	colorHex: string;
	colorSlug: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

export function ColorsRowActions({
	colorId,
	colorName,
	colorHex,
	colorSlug,
	open,
	onOpenChange,
	hideTrigger,
}: ColorsRowActionsProps) {
	const { open: openDialog } = useDialog(COLOR_DIALOG_ID);
	const { open: openAlert } = useAlertDialog(DELETE_COLOR_DIALOG_ID);
	const { duplicate, isPending: isDuplicating } = useDuplicateColor();
	const isMobile = useIsMobile();
	const router = useRouter();

	const sections: ActionMenuSection[] = [
		{
			key: "manage",
			items: [
				{
					key: "edit",
					label: "Éditer",
					icon: SquarePen,
					onSelect: () => {
						if (isMobile) {
							router.push(`/admin/catalogue/couleurs/${colorSlug}/modifier`);
						} else {
							openDialog({
								color: { id: colorId, name: colorName, hex: colorHex, slug: colorSlug },
							});
						}
					},
				},
				{
					key: "duplicate",
					label: "Dupliquer",
					icon: Copy,
					disabled: isDuplicating,
					onSelect: () => duplicate(colorId),
				},
				{
					key: "variants",
					label: "Voir les variantes",
					icon: ExternalLink,
					href: `/admin/catalogue/inventaire?colorId=${colorId}`,
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					onSelect: () => openAlert({ colorId, colorName }),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu open={open} onOpenChange={onOpenChange}>
			{!hideTrigger && (
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0 motion-safe:transition-transform motion-safe:active:scale-95"
						aria-label={`Actions pour ${colorName}`}
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
			)}
			<ResponsiveActionMenuContent title="Actions" description={colorName} sections={sections} />
		</ResponsiveActionMenu>
	);
}
