"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { CollectionStatus } from "@/app/generated/prisma/enums";
import { createCollection } from "@/modules/collections/actions/create-collection";
import { COLLECTION_STATUS_LABELS } from "@/modules/collections/constants/collection-status.constants";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { useAppForm } from "@/shared/components/forms";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/with-view-transition";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

interface CreateCollectionFormProps {
	/** Callback appelé après succès */
	onSuccess?: () => void;
	/** Callback appelé avec l'id de la collection créée (création à la volée) */
	onCreated?: (id: string) => void;
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

export function CreateCollectionForm({
	onSuccess,
	onCreated,
	redirectOnSuccess = true,
	className,
}: CreateCollectionFormProps = {}) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			status: CollectionStatus.PUBLIC as CollectionStatus,
		},
	});

	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			createCollection,

			createToastCallbacks({
				loadingMessage: "Création de la collection…",
				onSuccess: (result) => {
					haptic("success");
					allowNavigationRef.current?.();
					form.reset();
					const data = (
						result as {
							data?: { id?: string; name?: string; collectionStatus?: CollectionStatus };
						}
					).data;
					if (data?.id) {
						onCreated?.(data.id);
					}
					onSuccess?.();
				},
				onError: () => haptic("error"),
				successAction: redirectOnSuccess
					? {
							label: "Voir les collections",
							onClick: () => navigateWithTransition(router, LIST_PATH),
						}
					: undefined,
			}),
		),
		undefined,
	);

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus du schéma serveur serait muet.
	const serverErrors = useServerFieldErrors({ state });

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending && !isMobile);

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
	});

	return (
		<form
			ref={formRef}
			aria-label="Formulaire de création de collection"
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				event.preventDefault();
				if (isPending || form.state.isSubmitting) return;
				const formData = new FormData(event.currentTarget);
				runAfterValidation(
					form.handleSubmit(),
					() => {
						if (form.state.isValid) {
							action(formData);
						} else {
							requestAnimationFrame(() => focusFirstInvalid());
						}
					},
					"CreateCollectionForm",
				);
			}}
		>
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
							return undefined;
						},
					}}
				>
					{(field) => (
						<field.InputField
							label="Nom"
							type="text"
							placeholder="ex: Nouveautés 2025, Collection Été"
							disabled={isPending}
							required
							autoCapitalize="words"
							enterKeyHint="next"
						/>
					)}
				</form.AppField>

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
							options={[CollectionStatus.DRAFT, CollectionStatus.PUBLIC].map((s) => ({
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
					<form.Subscribe selector={(state) => [state.canSubmit] as const}>
						{([canSubmit]) => (
							<div className="flex justify-end">
								<Button
									type="submit"
									size="input"
									disabled={!canSubmit || isPending}
									onClick={() => haptic("medium")}
									className="w-full sm:w-auto sm:min-w-56"
								>
									{isPending && (
										<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
									)}
									<span>{isPending ? "Création…" : "Créer la collection"}</span>
									{!isPending && (
										<Kbd
											aria-hidden="true"
											className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex"
										>
											⌘S
										</Kbd>
									)}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
