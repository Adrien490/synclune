"use client";

import { Button } from "@/shared/components/ui/button";
import { MATERIAL_DIALOG_ID } from "@/modules/materials/components/material-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export function CreateMaterialButton() {
	const { open } = useDialog(MATERIAL_DIALOG_ID);

	return (
		<Button onClick={() => open()}>
			Créer un matériau
		</Button>
	);
}
