"use client";

import { useActionState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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

	const form = useAppForm({
		defaultValues: {
			question: "",
			answer: "",
			isActive: true,
			links: [] as LinkEntry[],
		},
	});

	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createFaqItem,
			createToastCallbacks({
				loadingMessage: "Création de la question...",
				onSuccess: () => {
					close();
					form.reset();
				},
			}),
		),
		undefined,
	);

	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateFaqItem,
			createToastCallbacks({
				loadingMessage: "Mise à jour de la question...",
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
				links: faqItem.links ?? [],
			});
		} else {
			form.reset({
				question: "",
				answer: "",
				isActive: true,
				links: [],
			});
		}
	}, [faqItem, form]);

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			close();
		}
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
						<form.Subscribe selector={(state) => state.values.links}>
							{(links) => (
								<input
									type="hidden"
									name="links"
									value={links.length > 0 ? JSON.stringify(links) : ""}
								/>
							)}
						</form.Subscribe>
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

						<form.Field name="links" mode="array">
							{(field) => (
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<p className="text-sm font-medium">
											Liens <span className="text-muted-foreground font-normal">(optionnel)</span>
										</p>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => field.pushValue({ text: "", href: "" })}
											disabled={field.state.value.length >= 5}
										>
											<Plus className="h-3.5 w-3.5" />
											Ajouter un lien
										</Button>
									</div>
									<p className="text-muted-foreground text-xs">
										Utilisez {"{{link0}}"}, {"{{link1}}"}, etc. dans la réponse pour insérer ces
										liens.
									</p>
									{field.state.value.map((link, index) => (
										<div key={`link-${index}`} className="flex items-start gap-2">
											<span className="text-muted-foreground mt-2.5 shrink-0 text-xs font-medium">
												{`{{link${index}}}`}
											</span>
											<div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
												<Input
													type="text"
													value={link.text}
													onChange={(e) =>
														field.handleChange(
															field.state.value.map((l, i) =>
																i === index ? { ...l, text: e.target.value } : l,
															),
														)
													}
													placeholder="Texte du lien"
													aria-label={`Texte du lien ${index}`}
												/>
												<Input
													type="text"
													value={link.href}
													onChange={(e) =>
														field.handleChange(
															field.state.value.map((l, i) =>
																i === index ? { ...l, href: e.target.value } : l,
															),
														)
													}
													placeholder="URL (ex: /collections)"
													aria-label={`URL du lien ${index}`}
												/>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="text-destructive hover:text-destructive mt-1 h-8 w-8 shrink-0 p-0"
												onClick={() => field.removeValue(index)}
												aria-label={`Supprimer le lien ${index}`}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									))}
								</div>
							)}
						</form.Field>

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
