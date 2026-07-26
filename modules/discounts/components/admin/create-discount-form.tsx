"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { createDiscount } from "@/modules/discounts/actions/create-discount";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
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
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { useDiscountForm } from "../../hooks/use-discount-form";
import { DiscountFormFields } from "./discount-form-fields";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

interface CreateDiscountFormProps {
	className?: string;
}

const LIST_PATH = "/admin/marketing/discounts";

const FIELD_LABELS: Record<string, string> = {
	code: "Code promo",
	type: "Type de remise",
	value: "Valeur",
	minOrderAmount: "Montant minimum de commande",
	maxUsageCount: "Utilisations totales max",
	maxUsagePerUser: "Utilisations par client max",
	startsAt: "Date de début",
	endsAt: "Date de fin",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function CreateDiscountForm({ className }: CreateDiscountFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const { form } = useDiscountForm();

	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			createDiscount,

			createToastCallbacks({
				loadingMessage: "Création du code…",
				successAction: {
					label: "Voir les codes",
					onClick: () => navigateWithTransition(router, LIST_PATH),
				},
				onSuccess: () => {
					haptic("success");
					allowNavigationRef.current?.();
					form.reset();
				},
				onError: () => {
					haptic("error");
				},
			}),
		),
		undefined,
	);

	// Les messages discount ne sont pas path-préfixés → tout VALIDATION_ERROR serveur est global
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
			aria-label="Formulaire de création de code promo"
			aria-busy={isPending}
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
					"CreateDiscountForm",
				);
			}}
		>
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
				<DiscountFormFields form={form} isPending={isPending} />
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<div className="flex justify-end">
						<form.SubmitButton
							isPending={isPending}
							idleLabel="Créer le code"
							pendingLabel="Création…"
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</div>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
