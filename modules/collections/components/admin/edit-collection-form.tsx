"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { updateCollection } from "@/modules/collections/actions/update-collection";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import type { EditableCollection } from "@/modules/collections/types/editable-collection.types";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/view-transition";

export type { EditableCollection };

interface EditCollectionFormProps {
	collection: EditableCollection;
	/** Callback appelé après succès */
	onSuccess?: () => void;
	/** Rediriger vers la liste après succès (défaut: true) */
	redirectOnSuccess?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
}

const LIST_PATH = "/admin/catalogue/collections";

const FIELD_LABELS: Record<string, string> = {
	name: "Nom",
	description: "Description",
	status: "Statut",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditCollectionForm({
	collection,
	onSuccess,
	redirectOnSuccess = true,
	className,
}: EditCollectionFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: {
			id: collection.id,
			name: collection.name,
			description: collection.description ?? "",
			status: collection.status,
		},
	});

	const isPublic = collection.status === CollectionStatus.PUBLIC;
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateCollection,

			createToastCallbacks({
				loadingMessage: "Mise à jour de la collection…",
				successAction: redirectOnSuccess
					? {
							label: "Voir les collections",
							onClick: () => navigateWithTransition(router, LIST_PATH),
						}
					: undefined,
				onSuccess: () => {
					haptic("success");
					allowNavigationRef.current?.();
					onSuccess?.();
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: LIST_PATH,
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
		getCanSubmit: () => form.state.canSubmit,
	});

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire de modification de collection"
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={() => {
				void form.handleSubmit();
				if (!form.state.canSubmit) {
					focusFirstInvalid();
				}
			}}
		>
			<input type="hidden" name="id" value={collection.id} />
			<form.Subscribe selector={(state) => ({ status: state.values.status })}>
				{({ status }) => <input type="hidden" name="status" value={status} />}
			</form.Subscribe>

			<FormServerErrorAlert errors={serverErrors} />

			<form.Subscribe
				selector={(state) => ({
					submissionAttempts: state.submissionAttempts,
					fieldMeta: state.fieldMeta,
				})}
			>
				{({ submissionAttempts, fieldMeta }) => {
					if (!submissionAttempts) return null;
					const fieldErrors = Object.entries(
						fieldMeta as Record<string, { errors?: Array<string | undefined> }>,
					)
						.map(([name, meta]) => {
							const first = meta.errors?.find((e): e is string => Boolean(e));
							return first ? { name, label: FIELD_LABELS[name] ?? name, message: first } : null;
						})
						.filter(
							(item): item is { name: string; label: string; message: string } => item !== null,
						);
					if (fieldErrors.length === 0) return null;
					return <ErrorSummary fieldErrors={fieldErrors} />;
				}}
			</form.Subscribe>

			<fieldset disabled={isPending} className="space-y-6">
				<RequiredFieldsNote />

				<div className="space-y-1.5">
					<form.AppField
						name="name"
						validators={{
							onChange: ({ value }) => {
								if (!value || value.length < 1) {
									return "Le nom est requis";
								}
								if (value.length > 100) {
									return "Le nom ne peut pas dépasser 100 caractères";
								}
								if (isPublic && value !== collection.name) {
									return "Une collection publiée ne peut pas être renommée (SEO). Repassez-la en brouillon d'abord.";
								}
								return undefined;
							},
						}}
					>
						{(field) => (
							<field.InputField
								label="Nom"
								type="text"
								placeholder="ex: Nouveautés 2025, Collection Été"
								disabled={isPending || isPublic}
								required
								autoCapitalize="words"
								enterKeyHint="next"
							/>
						)}
					</form.AppField>
					{isPublic && (
						<p className="text-muted-foreground text-xs">
							Le nom est verrouillé tant que la collection est publiée pour préserver l&apos;URL et
							le SEO.
						</p>
					)}
				</div>

				<form.AppField
					name="description"
					validators={{
						onChange: ({ value }) => {
							if (value && value.length > 1000) {
								return "La description ne peut pas dépasser 1000 caractères";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.TextareaField
							label="Description"
							placeholder="Décrivez cette collection…"
							disabled={isPending}
							rows={4}
							className="resize-none"
						/>
					)}
				</form.AppField>

				<form.AppField name="status">
					{(field) => (
						<field.SelectField
							label="Statut"
							options={Object.values(CollectionStatus).map((s) => ({
								value: s,
								label: COLLECTION_STATUS_LABELS[s],
							}))}
							disabled={isPending}
						/>
					)}
				</form.AppField>
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<div className="flex justify-end">
						<form.SubmitButton
							isPending={isPending}
							idleLabel="Enregistrer"
							pendingLabel="Mise à jour…"
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</div>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
