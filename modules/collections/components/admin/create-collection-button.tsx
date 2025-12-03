"use client";

import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useRouter } from "next/navigation";
import { COLLECTION_DIALOG_ID } from "./collection-form-dialog";

export function CreateCollectionButton() {
	const { open } = useDialog(COLLECTION_DIALOG_ID);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleClick = () => {
		if (isMobile) {
			router.push("/admin/catalogue/collections/nouveau");
		} else {
			open();
		}
	};

	return (
		<Button onClick={handleClick}>
			Créer une collection
		</Button>
	);
}
