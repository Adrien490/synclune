"use client";

import { useState, useEffect } from "react";

import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useUpdateCustomizationNotes } from "../../hooks/use-update-customization-notes";

export const UPDATE_NOTES_DIALOG_ID = "update-customization-notes";

type UpdateNotesDialogData = {
	requestId: string;
	clientName: string;
	currentNotes: string | null;
	[key: string]: unknown;
};

export function UpdateNotesDialog() {
	const { isOpen, data, close } = useDialog<UpdateNotesDialogData>(
		UPDATE_NOTES_DIALOG_ID
	);
	const [notes, setNotes] = useState("");
	const { action, isPending } = useUpdateCustomizationNotes({
		onSuccess: close,
	});

	// Reset notes when dialog opens with new data
	useEffect(() => {
		if (isOpen && data) {
			setNotes(data.currentNotes || "");
		}
	}, [isOpen, data]);

	const handleSubmit = () => {
		if (!data?.requestId) return;

		const formData = new FormData();
		formData.set("requestId", data.requestId);
		formData.set("notes", notes);
		action(formData);
	};

	const hasChanges = notes !== (data?.currentNotes || "");

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="sm:max-w-[500px]">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Notes internes</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Demande de{" "}
						<span className="font-semibold">{data?.clientName}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="py-4">
					<Textarea
						placeholder="Ajouter des notes internes..."
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="min-h-[150px] resize-none"
						maxLength={2000}
					/>
					<p className="mt-2 text-xs text-muted-foreground text-right">
						{notes.length}/2000 caractères
					</p>
				</div>

				<ResponsiveDialogFooter>
					<Button variant="outline" onClick={close} disabled={isPending}>
						Annuler
					</Button>
					<Button onClick={handleSubmit} disabled={isPending || !hasChanges}>
						{isPending ? "Enregistrement..." : "Enregistrer"}
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
