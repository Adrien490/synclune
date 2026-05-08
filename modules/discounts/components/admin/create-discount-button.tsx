"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { DISCOUNT_DIALOG_ID } from "./discount-form-dialog";

export function CreateDiscountButton() {
	const { open } = useDialog(DISCOUNT_DIALOG_ID);
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const router = useRouter();

	return (
		<Button
			onClick={() => {
				haptic("selection");
				if (isMobile) {
					router.push("/admin/marketing/discounts/nouveau");
				} else {
					open();
				}
			}}
			size="sm"
		>
			Nouveau code
		</Button>
	);
}
