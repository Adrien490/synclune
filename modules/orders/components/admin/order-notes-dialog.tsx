"use client";

import { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useOrderNotes } from "@/modules/orders/hooks/use-order-notes";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MessageSquarePlus, StickyNote, Trash2 } from "lucide-react";

export const ORDER_NOTES_DIALOG_ID = "order-notes";

type OrderNotesDialogData = {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
};

export function OrderNotesDialog() {
	const { isOpen, data, close } = useDialog<OrderNotesDialogData>(ORDER_NOTES_DIALOG_ID);
	const [newNote, setNewNote] = useState("");
	const {
		notes,
		fetchError,
		loadNotes,
		reset,
		add,
		remove,
		isPendingFetch,
		isPendingAdd,
		isPendingDelete,
	} = useOrderNotes();

	useEffect(() => {
		if (isOpen && data?.orderId) {
			queueMicrotask(() => {
				loadNotes(data.orderId);
				setNewNote("");
			});
		}
		if (!isOpen) {
			queueMicrotask(() => reset());
		}
	}, [isOpen, data?.orderId, loadNotes, reset]);

	const handleAddNote = () => {
		if (!data?.orderId || !newNote.trim()) return;

		add(data.orderId, newNote.trim(), () => {
			setNewNote("");
			loadNotes(data.orderId);
		});
	};

	const handleDeleteNote = (noteId: string) => {
		if (!data?.orderId) return;
		remove(noteId, () => loadNotes(data.orderId));
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="flex max-h-[80vh] flex-col sm:max-w-150">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>Notes internes</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande: <span className="font-semibold tabular-nums">{data?.orderNumber}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{/* Formulaire d'ajout */}
				<div className="shrink-0 space-y-2 border-b pb-4">
					<Textarea
						placeholder="Ajouter une note..."
						value={newNote}
						onChange={(e) => setNewNote(e.target.value)}
						className="min-h-20 resize-none"
					/>
					<div className="flex justify-end">
						<Button onClick={handleAddNote} disabled={isPendingAdd || !newNote.trim()} size="sm">
							{isPendingAdd ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<MessageSquarePlus className="h-4 w-4" />
							)}
							Ajouter
						</Button>
					</div>
				</div>

				{/* Liste des notes */}
				<div className="flex-1 space-y-3 overflow-auto py-4">
					{isPendingFetch ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
						</div>
					) : fetchError ? (
						<div className="text-destructive py-8 text-center">{fetchError}</div>
					) : notes.length === 0 ? (
						<div className="text-muted-foreground py-8 text-center">
							<StickyNote className="mx-auto mb-3 h-12 w-12 opacity-50" />
							<p>Aucune note pour cette commande</p>
						</div>
					) : (
						notes.map((note) => (
							<div key={note.id} className="bg-muted group relative rounded-lg p-3">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="wrap-break-words text-sm whitespace-pre-wrap">{note.content}</p>
										<div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
											<span className="font-medium">{note.authorName}</span>
											<span>•</span>
											<span>
												{format(new Date(note.createdAt), "d MMM yyyy à HH:mm", {
													locale: fr,
												})}
											</span>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="text-destructive hover:text-destructive h-7 w-7 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
										onClick={() => handleDeleteNote(note.id)}
										disabled={isPendingDelete}
									>
										{isPendingDelete ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Trash2 className="h-3.5 w-3.5" />
										)}
									</Button>
								</div>
							</div>
						))
					)}
				</div>

				<div className="flex shrink-0 justify-end border-t pt-4">
					<Button variant="outline" onClick={close}>
						Fermer
					</Button>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
