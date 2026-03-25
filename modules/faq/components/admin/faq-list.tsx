"use client";

import { use, useState } from "react";
import { GripVertical, SquarePen, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { useSortable } from "@dnd-kit/react/sortable";
import { arrayMove } from "@dnd-kit/helpers";
import type { DragEndEvent } from "@dnd-kit/react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { cn } from "@/shared/utils/cn";

import { FAQ_FORM_DIALOG_ID, DELETE_FAQ_DIALOG_ID } from "../../constants/dialog";
import { useReorderFaqItems } from "../../hooks/use-reorder-faq-items";
import type { FaqListItem, FaqDialogData, DeleteFaqData } from "../../types/faq.types";

interface FaqListProps {
	faqItemsPromise: Promise<FaqListItem[]>;
}

export function FaqList({ faqItemsPromise }: FaqListProps) {
	const serverItems = use(faqItemsPromise);
	const [items, setItems] = useState<FaqListItem[]>(serverItems);
	const [isDragging, setIsDragging] = useState(false);
	const [liveMessage, setLiveMessage] = useState("");
	const { open: openDialog } = useDialog<FaqDialogData>(FAQ_FORM_DIALOG_ID);
	const { open: openAlert } = useAlertDialog<DeleteFaqData>(DELETE_FAQ_DIALOG_ID);
	const { reorder, isPending: isReordering } = useReorderFaqItems();

	// Sync with server data on re-render (after revalidation)
	if (serverItems !== items && !isDragging) {
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

	const handleDragStart = () => {
		setIsDragging(true);
		setLiveMessage("Élément sélectionné. Utilisez les flèches pour déplacer.");
	};

	const handleDragEnd: DragEndEvent = (event) => {
		setIsDragging(false);

		if (event.canceled) {
			setLiveMessage("Déplacement annulé.");
			return;
		}

		const { source, target } = event.operation;
		if (!source || !target || source.id === target.id) {
			setLiveMessage("");
			return;
		}

		const oldIndex = items.findIndex((i) => i.id === source.id);
		const newIndex = items.findIndex((i) => i.id === target.id);
		const newItems = arrayMove(items, oldIndex, newIndex);
		setItems(newItems);

		const item = items[oldIndex]!;
		setLiveMessage(
			`"${item.question}" déplacé en position ${newIndex + 1}, sur ${newItems.length}`,
		);

		const reorderData = newItems.map((it, i) => ({
			id: it.id,
			position: i,
		}));
		reorder(reorderData);
	};

	const handleMoveUp = (index: number) => {
		if (index === 0) return;

		const newItems = arrayMove(items, index, index - 1);
		const item = items[index]!;
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

		const newItems = arrayMove(items, index, index + 1);
		const item = items[index]!;
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
		<DragDropProvider
			sensors={[
				PointerSensor.configure({
					activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
				}),
				KeyboardSensor,
			]}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="space-y-2">
				<span id="faq-drag-instructions" className="sr-only">
					Utilisez Espace ou Entrée pour saisir un élément, les flèches pour le déplacer, Espace ou
					Entrée pour déposer, Échap pour annuler.
				</span>
				<div className="sr-only" aria-live="polite" aria-atomic="true">
					{liveMessage}
				</div>
				{items.map((item, index) => (
					<SortableFaqItem
						key={item.id}
						item={item}
						index={index}
						totalCount={items.length}
						isReordering={isReordering}
						onMoveUp={() => handleMoveUp(index)}
						onMoveDown={() => handleMoveDown(index)}
						onEdit={() => handleEdit(item)}
						onDelete={() => handleDelete(item)}
					/>
				))}
			</div>
			<DragOverlay>
				{(source) => {
					const item = items.find((i) => i.id === source.id);
					if (!item) return null;
					return (
						<div className="bg-card border-primary flex items-center gap-3 rounded-lg border-2 p-4 shadow-2xl">
							<GripVertical className="text-muted-foreground h-4 w-4 shrink-0" />
							<p className="truncate font-medium">{item.question}</p>
						</div>
					);
				}}
			</DragOverlay>
		</DragDropProvider>
	);
}

interface SortableFaqItemProps {
	item: FaqListItem;
	index: number;
	totalCount: number;
	isReordering: boolean;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

function SortableFaqItem({
	item,
	index,
	totalCount,
	isReordering,
	onMoveUp,
	onMoveDown,
	onEdit,
	onDelete,
}: SortableFaqItemProps) {
	const { ref, handleRef, isDragSource } = useSortable({
		id: item.id,
		index,
	});

	return (
		<div
			ref={ref}
			className={cn(
				"bg-card flex items-center gap-3 rounded-lg border p-4 transition-shadow",
				isDragSource && "opacity-50 shadow-lg",
				isReordering && "pointer-events-none opacity-60",
			)}
		>
			<div className="flex shrink-0 flex-col gap-0.5">
				<Button
					variant="ghost"
					size="sm"
					className="h-6 w-6 p-0"
					onClick={onMoveUp}
					disabled={index === 0 || isReordering}
					aria-label={`Monter "${item.question}"`}
				>
					<ChevronUp className="h-4 w-4" />
				</Button>
				<button
					type="button"
					ref={handleRef}
					className="text-muted-foreground hover:text-foreground flex cursor-grab items-center justify-center active:cursor-grabbing"
					aria-label={`Réordonner "${item.question}"`}
					aria-describedby="faq-drag-instructions"
				>
					<GripVertical className="h-4 w-4" />
				</button>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 w-6 p-0"
					onClick={onMoveDown}
					disabled={index >= totalCount - 1 || isReordering}
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
					onClick={onEdit}
					aria-label={`Modifier "${item.question}"`}
				>
					<SquarePen className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="text-destructive hover:text-destructive h-9 w-9 p-0"
					onClick={onDelete}
					aria-label={`Supprimer "${item.question}"`}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
