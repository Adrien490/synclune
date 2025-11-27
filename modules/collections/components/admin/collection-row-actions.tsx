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
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { COLLECTION_DIALOG_ID } from "./collection-form-dialog";
import { DELETE_COLLECTION_DIALOG_ID } from "./delete-collection-alert-dialog";

interface CollectionRowActionsProps {
	collectionId: string;
	collectionName: string;
	collectionSlug: string;
	collectionDescription: string | null;
	collectionImageUrl: string | null;
	productsCount: number;
}

export function CollectionRowActions({
	collectionId,
	collectionName,
	collectionSlug,
	collectionDescription,
	collectionImageUrl,
	productsCount,
}: CollectionRowActionsProps) {
	const { open: openEditDialog } = useDialog(COLLECTION_DIALOG_ID);
	const { open: openDeleteDialog } = useAlertDialog(DELETE_COLLECTION_DIALOG_ID);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem asChild>
					<Link href={`/collections/${collectionSlug}`}>
						<Eye className="h-4 w-4" />
						Voir
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => {
						openEditDialog({
							collection: {
								id: collectionId,
								name: collectionName,
								slug: collectionSlug,
								description: collectionDescription,
								imageUrl: collectionImageUrl,
							},
						});
					}}
				>
					<Pencil className="h-4 w-4" />
					Éditer
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => {
						openDeleteDialog({
							collectionId,
							collectionName,
							productsCount,
						});
					}}
					className="text-destructive"
				>
					<Trash2 className="h-4 w-4" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
