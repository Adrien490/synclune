"use client";

import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { COLLECTION_DIALOG_ID } from "./collection-form-dialog";

export function CreateCollectionButton() {
	const { open } = useDialog(COLLECTION_DIALOG_ID);

	return (
		<Button onClick={() => open()}>
			Créer une collection
		</Button>
	);
}
