"use client";

import { Button } from "@/shared/components/ui/button";
import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export function CreateProductTypeButton() {
	const { open } = useDialog(PRODUCT_TYPE_DIALOG_ID);

	return (
		<Button onClick={() => open()}>
			Créer un type
		</Button>
	);
}
