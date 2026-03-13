"use client";

import { use, useState } from "react";
import { GripVertical, Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { cn } from "@/shared/utils/cn";

import { FAQ_FORM_DIALOG_ID, DELETE_FAQ_DIALOG_ID } from "../../constants/dialog";
import { useReorderFaqItems } from "../../hooks/use-reorder-faq-items";
import type { FaqListItem, FaqDialogData, DeleteFaqData } from "../../types/content.types";

interface FaqListProps {
	faqItemsPromise: Promise<FaqListItem[]>;
}

export function FaqList({ faqItemsPromise }: FaqListProps) {
	const serverItems = use(faqItemsPromise);
	const [items, setItems] = useState<FaqListItem[]>(serverItems);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [liveMessage, setLiveMessage] = useState("");
	const { open: openDialog } = useDialog<FaqDialogData>(FAQ_FORM_DIALOG_ID);
	const { open: openAlert } = useAlertDialog<DeleteFaqData>(DELETE_FAQ_DIALOG_ID);
	const { reorder, isPending: isReordering } = useReorderFaqItems();

	// Sync with server data on re-render (after revalidation)
	if (serverItems !== items && draggedIndex === null) {
		setItems(serverItems);
	}

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
				<p className="text-muted-foreground text-sm">Aucune question FAQ pour le moment</p>
				<p className="text-muted-foreground mt-1 text-xs">
					Créez votre première question pour l&apos;afficher sur la homepage.
				</p>
			</div>
		);
	}

	const handleDragStart = (index: number) => {
		setDraggedIndex(index);
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;

		const newItems = [...items];
		const draggedItem = newItems[draggedIndex]!;
		newItems.splice(draggedIndex, 1);
		newItems.splice(index, 0, draggedItem);
		setItems(newItems);
		setDraggedIndex(index);
	};

	const handleDragEnd = () => {
		if (draggedIndex === null) return;
		setDraggedIndex(null);

		const reorderData = items.map((item, index) => ({
			id: item.id,
			position: index,
		}));
		reorder(reorderData);
	};

	const handleMoveUp = (index: number) => {
		if (index === 0) return;

		const newItems = [...items];
		const item = newItems[index]!;
		newItems.splice(index, 1);
		newItems.splice(index - 1, 0, item);
		setItems(newItems);

		setLiveMessage(`"${item.question}" déplacé en position ${index}, sur ${newItems.length}`);

		const reorderData = newItems.map((it, i) => ({
			id: it.id,
			position: i,
		}));
		reorder(reorderData);
	};

	const handleMoveDown = (index: number) => {
		if (index >= items.length - 1) return;

		const newItems = [...items];
		const item = newItems[index]!;
		newItems.splice(index, 1);
		newItems.splice(index + 1, 0, item);
		setItems(newItems);

		setLiveMessage(`"${item.question}" déplacé en position ${index + 2}, sur ${newItems.length}`);

		const reorderData = newItems.map((it, i) => ({
			id: it.id,
			position: i,
		}));
		reorder(reorderData);
	};

	const handleEdit = (faqItem: FaqListItem) => {
		openDialog({ faqItem });
	};

	const handleDelete = (faqItem: FaqListItem) => {
		openAlert({
			faqItemId: faqItem.id,
			faqItemQuestion: faqItem.question,
		});
	};

	return (
		<div className="space-y-2">
			<div className="sr-only" aria-live="polite" aria-atomic="true">
				{liveMessage}
			</div>
			{/* eslint-disable jsx-a11y/no-static-element-interactions */}
			{items.map((item, index) => (
				<div
					key={item.id}
					draggable
					onDragStart={() => handleDragStart(index)}
					onDragOver={(e) => handleDragOver(e, index)}
					onDragEnd={handleDragEnd}
					className={cn(
						"bg-card flex items-center gap-3 rounded-lg border p-4 transition-shadow",
						draggedIndex === index && "opacity-50 shadow-lg",
						isReordering && "pointer-events-none opacity-60",
					)}
				>
					<div className="flex shrink-0 flex-col gap-0.5">
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							onClick={() => handleMoveUp(index)}
							disabled={index === 0 || isReordering}
							aria-label={`Monter "${item.question}"`}
						>
							<ChevronUp className="h-4 w-4" />
						</Button>
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground flex cursor-grab items-center justify-center active:cursor-grabbing"
							aria-label="Réordonner"
							tabIndex={-1}
						>
							<GripVertical className="h-4 w-4" />
						</button>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0"
							onClick={() => handleMoveDown(index)}
							disabled={index >= items.length - 1 || isReordering}
							aria-label={`Descendre "${item.question}"`}
						>
							<ChevronDown className="h-4 w-4" />
						</Button>
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<p className="truncate font-medium">{item.question}</p>
							{!item.isActive && (
								<Badge variant="secondary" className="shrink-0 text-xs">
									Masquée
								</Badge>
							)}
						</div>
						<p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
							{item.answer.replace(/\{\{link\d+\}\}/g, "[lien]")}
						</p>
					</div>

					<div className="flex shrink-0 items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							className="h-9 w-9 p-0"
							onClick={() => handleEdit(item)}
							aria-label={`Modifier "${item.question}"`}
						>
							<Edit className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive h-9 w-9 p-0"
							onClick={() => handleDelete(item)}
							aria-label={`Supprimer "${item.question}"`}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			))}
			{/* eslint-enable jsx-a11y/no-static-element-interactions */}
		</div>
	);
}
