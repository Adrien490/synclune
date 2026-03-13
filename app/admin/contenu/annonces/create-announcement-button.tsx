"use client";

import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { ANNOUNCEMENT_FORM_DIALOG_ID } from "@/modules/content/constants/dialog";

export function CreateAnnouncementButton() {
	const { open } = useDialog(ANNOUNCEMENT_FORM_DIALOG_ID);

	return (
		<Button onClick={() => open()} size="sm">
			<Plus className="h-4 w-4" />
			Nouvelle annonce
		</Button>
	);
}
