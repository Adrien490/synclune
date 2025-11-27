"use client";

import { Button } from "@/shared/components/ui/button";
import { COLOR_DIALOG_ID } from "@/modules/colors/components/color-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export function CreateColorButton() {
	const { open } = useDialog(COLOR_DIALOG_ID);

	return (
		<Button onClick={() => open()}>
			Créer une couleur
		</Button>
	);
}
