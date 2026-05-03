"use client";

import { useRouter } from "next/navigation";

import { COLOR_DIALOG_ID } from "@/modules/colors/components/color-form-dialog";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export function CreateColorButton() {
	const { open } = useDialog(COLOR_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleClick = () => {
		if (isMobile) {
			router.push("/admin/catalogue/couleurs/nouveau");
		} else {
			open();
		}
	};

	return <Button onClick={handleClick}>Créer une couleur</Button>;
}
