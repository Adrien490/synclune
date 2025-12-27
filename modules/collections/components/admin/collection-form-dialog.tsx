"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { CreateCollectionForm } from "./create-collection-form";
import { EditCollectionForm, type EditableCollection } from "./edit-collection-form";

export const COLLECTION_DIALOG_ID = "collection-form";

interface CollectionDialogData extends Record<string, unknown> {
	collection?: EditableCollection;
}

export function CollectionFormDialog() {
	const { isOpen, close, data } =
		useDialog<CollectionDialogData>(COLLECTION_DIALOG_ID);
	const collection = data?.collection;
	const isUpdateMode = !!collection;

	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					close();
				}
			}}
		>
			<ResponsiveDialogContent className="max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier la collection" : "Créer une collection"}
					</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>

				{isUpdateMode && collection ? (
					<EditCollectionForm
						collection={collection}
						onSuccess={close}
						redirectOnSuccess={false}
					/>
				) : (
					<CreateCollectionForm
						onSuccess={close}
						redirectOnSuccess={false}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
