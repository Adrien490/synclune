"use client";

import { useRouter } from "next/navigation";

import { PRODUCT_TYPE_DIALOG_ID } from "@/modules/product-types/components/product-type-form-dialog";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export function CreateProductTypeButton() {
	const { open } = useDialog(PRODUCT_TYPE_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleClick = () => {
		if (isMobile) {
			router.push("/admin/catalogue/types-de-produits/nouveau");
		} else {
			open();
		}
	};

	return <Button onClick={handleClick}>Créer un type</Button>;
}
