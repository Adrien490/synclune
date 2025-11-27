"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import { COLOR_DIALOG_ID } from "./color-form-dialog";
import { DELETE_COLOR_DIALOG_ID } from "@/modules/colors/components/admin/delete-color-alert-dialog";

interface ColorsRowActionsProps {
	colorId: string;
	colorName: string;
	colorHex: string;
	colorSlug: string;
}

export function ColorsRowActions({
	colorId,
	colorName,
	colorHex,
	colorSlug,
}: ColorsRowActionsProps) {
	const { open: openDialog } = useDialog(COLOR_DIALOG_ID);
	const { open: openAlert } = useAlertDialog(DELETE_COLOR_DIALOG_ID);

	const handleEdit = () => {
		openDialog({
			color: {
				id: colorId,
				name: colorName,
				hex: colorHex,
				slug: colorSlug,
			},
		});
	};

	const handleDelete = () => {
		openAlert({
			colorId,
			colorName,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleEdit}>
					<Edit className="h-4 w-4" />
					Éditer
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleDelete} className="text-destructive">
					<Trash2 className="h-4 w-4" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
