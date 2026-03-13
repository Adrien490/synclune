"use client";

import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { FAQ_FORM_DIALOG_ID } from "@/modules/content/constants/dialog";

export function CreateFaqButton() {
	const { open } = useDialog(FAQ_FORM_DIALOG_ID);

	return (
		<Button onClick={() => open()} size="sm">
			<Plus className="h-4 w-4" />
			Nouvelle question
		</Button>
	);
}
