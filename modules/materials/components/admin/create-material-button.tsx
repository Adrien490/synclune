"use client";

import { useRouter } from "next/navigation";

import { MATERIAL_DIALOG_ID } from "@/modules/materials/components/material-form-dialog";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export function CreateMaterialButton() {
	const { open } = useDialog(MATERIAL_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleClick = () => {
		if (isMobile) {
			router.push("/admin/catalogue/materiaux/nouveau");
		} else {
			open();
		}
	};

	return <Button onClick={handleClick}>Créer un matériau</Button>;
}
