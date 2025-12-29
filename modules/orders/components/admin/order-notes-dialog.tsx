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
import {
	getOrderNotes,
	type OrderNoteItem,
} from "@/modules/orders/data/get-order-notes";
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
	const [notes, setNotes] = useState<OrderNoteItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [newNote, setNewNote] = useState("");
	const { add, remove, isPendingAdd, isPendingDelete } = useOrderNotes();

	const loadNotes = async () => {
		if (!data?.orderId) return;

		setIsLoading(true);
		setError(null);

		const result = await getOrderNotes(data.orderId);

		if ("error" in result) {
			setError(result.error);
		} else {
			setNotes(result.notes);
		}

		setIsLoading(false);
	};

	useEffect(() => {
		if (isOpen && data) {
			loadNotes();
			setNewNote("");
		}
	}, [isOpen, data]);

	const handleAddNote = () => {
		if (!data?.orderId || !newNote.trim()) return;

		add(data.orderId, newNote.trim(), () => {
			setNewNote("");
			loadNotes();
		});
	};

	const handleDeleteNote = (noteId: string) => {
		remove(noteId, loadNotes);
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>Notes internes</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande: <span className="font-semibold font-mono">{data?.orderNumber}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{/* Formulaire d'ajout */}
				<div className="shrink-0 space-y-2 pb-4 border-b">
					<Textarea
						placeholder="Ajouter une note..."
						value={newNote}
						onChange={(e) => setNewNote(e.target.value)}
						className="min-h-[80px] resize-none"
					/>
					<div className="flex justify-end">
						<Button
							onClick={handleAddNote}
							disabled={isPendingAdd || !newNote.trim()}
							size="sm"
						>
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
				<div className="flex-1 overflow-auto space-y-3 py-4">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : error ? (
						<div className="text-center py-8 text-destructive">{error}</div>
					) : notes.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<StickyNote className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p>Aucune note pour cette commande</p>
						</div>
					) : (
						notes.map((note) => (
							<div
								key={note.id}
								className="p-3 rounded-lg bg-muted group relative"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<p className="text-sm whitespace-pre-wrap break-words">
											{note.content}
										</p>
										<div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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
										className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
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

				<div className="shrink-0 flex justify-end pt-4 border-t">
					<Button variant="outline" onClick={close}>
						Fermer
					</Button>
				</div>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
