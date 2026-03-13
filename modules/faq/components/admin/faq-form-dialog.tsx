"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { createFaqItem } from "../../actions/create-faq-item";
import { updateFaqItem } from "../../actions/update-faq-item";
import { FAQ_FORM_DIALOG_ID } from "../../constants/dialog";
import type { FaqDialogData } from "../../types/faq.types";

interface LinkEntry {
	text: string;
	href: string;
}

export function FaqFormDialog() {
	const { isOpen, close, data } = useDialog<FaqDialogData>(FAQ_FORM_DIALOG_ID);
	const faqItem = data?.faqItem;
	const isUpdateMode = !!faqItem;

	const [links, setLinks] = useState<LinkEntry[]>([]);
	const prevFaqItemRef = useRef(faqItem);

	// Sync links when dialog data changes (outside useEffect to avoid lint error)
	if (faqItem !== prevFaqItemRef.current) {
		prevFaqItemRef.current = faqItem;
		setLinks(faqItem?.links ?? []);
	}

	const form = useAppForm({
		defaultValues: {
			question: "",
			answer: "",
			isActive: true,
		},
	});

	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createFaqItem,
			createToastCallbacks({
				onSuccess: () => {
					close();
					form.reset();
					setLinks([]);
				},
			}),
		),
		undefined,
	);

	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateFaqItem,
			createToastCallbacks({
				onSuccess: () => {
					close();
				},
			}),
		),
		undefined,
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	useEffect(() => {
		if (faqItem) {
			form.reset({
				question: faqItem.question,
				answer: faqItem.answer,
				isActive: faqItem.isActive,
			});
		} else {
			form.reset({
				question: "",
				answer: "",
				isActive: true,
			});
		}
	}, [faqItem, form]);

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			close();
		}
	};

	const addLink = () => {
		setLinks((prev) => [...prev, { text: "", href: "" }]);
	};

	const removeLink = (index: number) => {
		setLinks((prev) => prev.filter((_, i) => i !== index));
	};

	const updateLink = (index: number, field: keyof LinkEntry, value: string) => {
		setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
	};

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier la question" : "Nouvelle question FAQ"}
					</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>

				<form action={action} className="flex min-h-0 flex-1 flex-col">
					<div className="flex-1 space-y-6 overflow-y-auto pr-2">
						{isUpdateMode && <input type="hidden" name="id" value={faqItem!.id} />}
						<input
							type="hidden"
							name="links"
							value={links.length > 0 ? JSON.stringify(links) : ""}
						/>
						<RequiredFieldsNote />

						<form.AppField name="question">
							{(field) => (
								<field.InputField
									label="Question"
									placeholder="Ex: Combien de temps pour recevoir ma commande ?"
									required
									maxLength={300}
								/>
							)}
						</form.AppField>

						<form.AppField name="answer">
							{(field) => (
								<field.TextareaField
									label="Réponse"
									placeholder="Utilisez {{link0}}, {{link1}} pour insérer des liens"
									required
									maxLength={5000}
								/>
							)}
						</form.AppField>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">
									Liens <span className="text-muted-foreground font-normal">(optionnel)</span>
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addLink}
									disabled={links.length >= 5}
								>
									<Plus className="h-3.5 w-3.5" />
									Ajouter un lien
								</Button>
							</div>
							<p className="text-muted-foreground text-xs">
								Utilisez {"{{link0}}"}, {"{{link1}}"}, etc. dans la réponse pour insérer ces liens.
							</p>
							{links.map((link, index) => (
								<div key={`link-${index}`} className="flex items-start gap-2">
									<span className="text-muted-foreground mt-2.5 shrink-0 text-xs font-medium">
										{`{{link${index}}}`}
									</span>
									<div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
										<input
											type="text"
											value={link.text}
											onChange={(e) => updateLink(index, "text", e.target.value)}
											placeholder="Texte du lien"
											className="border-input bg-background placeholder:text-muted-foreground rounded-md border px-3 py-2 text-sm"
										/>
										<input
											type="text"
											value={link.href}
											onChange={(e) => updateLink(index, "href", e.target.value)}
											placeholder="URL (ex: /collections)"
											className="border-input bg-background placeholder:text-muted-foreground rounded-md border px-3 py-2 text-sm"
										/>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="text-destructive hover:text-destructive mt-1 h-8 w-8 shrink-0 p-0"
										onClick={() => removeLink(index)}
										aria-label={`Supprimer le lien ${index}`}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							))}
						</div>

						<form.AppField name="isActive">
							{(field) => <field.CheckboxField label="Visible sur le site" />}
						</form.AppField>
					</div>

					<div className="mt-4 flex shrink-0 justify-end border-t pt-4">
						<Button disabled={isPending} type="submit">
							{isPending ? "Enregistrement..." : isUpdateMode ? "Enregistrer" : "Créer la question"}
						</Button>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
