"use client";

import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { DISCOUNT_DIALOG_ID } from "./discount-form-dialog";

export function CreateDiscountButton() {
	const { open } = useDialog(DISCOUNT_DIALOG_ID);
	const haptic = useHaptic();

	return (
		<Button
			onClick={() => {
				haptic("selection");
				open();
			}}
			size="sm"
		>
			Nouveau code
		</Button>
	);
}
