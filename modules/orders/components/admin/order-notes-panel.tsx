"use client";

/**
 * Panel de gestion des notes internes admin (ajout, suppression).
 *
 * Pattern dual : utilise en dialog modal (`order-notes-dialog.tsx`,
 * desktop) ET en page inline (`app/admin/ventes/commandes/[id]/notes/page.tsx`,
 * mobile via `useOrderActions.openNotes`). Cf. ORD-MAP-002.
 */
import { Suspense, use, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LoaderCircle, MessageSquarePlus, StickyNote, Trash2 } from "lucide-react";

import { getOrderNotes } from "@/modules/orders/data/get-order-notes";
import { useOrderNotes } from "@/modules/orders/hooks/use-order-notes";
import type { OrderNoteItem } from "@/modules/orders/types/order-notes.types";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/utils/cn";

type NotesResult = { notes: OrderNoteItem[] } | { error: string };

interface OrderNotesPanelProps {
	orderId: string;
	onClose?: () => void;
	className?: string;
}

export function OrderNotesPanel({ orderId, onClose, className }: OrderNotesPanelProps) {
	const [notesPromise, setNotesPromise] = useState<Promise<NotesResult>>(() =>
		getOrderNotes(orderId),
	);
	const [newNote, setNewNote] = useState("");
	const { add, remove, isPendingAdd, isPendingDelete } = useOrderNotes();

	const refetch = () => setNotesPromise(getOrderNotes(orderId));

	const handleAddNote = () => {
		if (!newNote.trim()) return;
		add(orderId, newNote.trim(), () => {
			setNewNote("");
			refetch();
		});
	};

	const handleDeleteNote = (noteId: string) => {
		remove(noteId, refetch);
	};

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			<div className="shrink-0 space-y-2 border-b pb-4">
				<Textarea
					placeholder="Ajouter une note…"
					value={newNote}
					onChange={(e) => setNewNote(e.target.value)}
					className="min-h-20 resize-none"
				/>
				<div className="flex justify-end">
					<Button onClick={handleAddNote} disabled={isPendingAdd || !newNote.trim()} size="sm">
						{isPendingAdd ? (
							<LoaderCircle className="size-4 animate-spin" />
						) : (
							<MessageSquarePlus className="size-4" />
						)}
						Ajouter
					</Button>
				</div>
			</div>

			<div className="flex-1 gap-y-3 overflow-auto py-4">
				<Suspense
					fallback={
						<div className="flex items-center justify-center py-8">
							<LoaderCircle className="text-muted-foreground size-6 animate-spin" />
						</div>
					}
				>
					<NotesList
						notesPromise={notesPromise}
						isPendingDelete={isPendingDelete}
						onDelete={handleDeleteNote}
					/>
				</Suspense>
			</div>

			{onClose && (
				<div className="flex shrink-0 justify-end border-t pt-4">
					<Button variant="outline" onClick={onClose}>
						Fermer
					</Button>
				</div>
			)}
		</div>
	);
}

function NotesList({
	notesPromise,
	isPendingDelete,
	onDelete,
}: {
	notesPromise: Promise<NotesResult>;
	isPendingDelete: boolean;
	onDelete: (noteId: string) => void;
}) {
	const result = use(notesPromise);

	if ("error" in result) {
		return <div className="text-destructive py-8 text-center">{result.error}</div>;
	}

	if (result.notes.length === 0) {
		return (
			<div className="text-muted-foreground py-8 text-center">
				<StickyNote className="mx-auto mb-3 size-12 opacity-50" aria-hidden="true" />
				<p>Aucune note pour cette commande</p>
			</div>
		);
	}

	return (
		<>
			{result.notes.map((note) => (
				<div key={note.id} className="bg-muted group relative rounded-lg p-3">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1">
							<p className="wrap-break-words text-sm whitespace-pre-wrap">{note.content}</p>
							<div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
								<span className="font-medium">{note.authorName}</span>
								<span>•</span>
								<span>
									{format(new Date(note.createdAt), "d MMM yyyy à HH:mm", { locale: fr })}
								</span>
							</div>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="text-destructive hover:text-destructive size-7 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
							onClick={() => onDelete(note.id)}
							disabled={isPendingDelete}
							aria-label={`Supprimer la note ${note.authorName}`}
						>
							{isPendingDelete ? (
								<LoaderCircle className="size-3.5 animate-spin" />
							) : (
								<Trash2 className="size-3.5" />
							)}
						</Button>
					</div>
				</div>
			))}
		</>
	);
}
