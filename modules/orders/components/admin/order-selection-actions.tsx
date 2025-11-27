"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { Edit, MoreVertical as MoreVerticalIcon, Printer, Trash2 } from "lucide-react";
import { BULK_DELETE_ORDERS_DIALOG_ID } from "./bulk-delete-orders-alert-dialog";

export function OrderSelectionActions() {
	const { selectedItems } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_ORDERS_DIALOG_ID);

	if (selectedItems.length === 0) return null;

	const handleBulkDelete = () => {
		bulkDeleteDialog.open({
			orderIds: selectedItems,
		});
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
						<span className="sr-only">Ouvrir le menu</span>
						<MoreVerticalIcon className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-[200px]">
					<DropdownMenuItem>Exporter CSV</DropdownMenuItem>
					<DropdownMenuItem>
						<Edit className="h-4 w-4" />
						Changer le statut
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<Printer className="h-4 w-4" />
						Imprimer les factures
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={handleBulkDelete}
						className="text-destructive"
					>
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
