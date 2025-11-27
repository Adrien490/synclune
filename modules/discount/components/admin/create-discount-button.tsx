"use client";

import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { Plus } from "lucide-react";
import { DISCOUNT_DIALOG_ID } from "./discount-form-dialog";

export function CreateDiscountButton() {
	const { open } = useDialog(DISCOUNT_DIALOG_ID);

	return (
		<Button onClick={() => open()} size="sm">
			<Plus className="h-4 w-4" />
			Nouveau code
		</Button>
	);
}
