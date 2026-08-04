"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";

import { type DiscountType } from "@/app/generated/prisma/browser";
import { updateDiscount } from "@/modules/discounts/actions/update-discount";
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
import { withViewTransition } from "@/shared/utils/view-transition";

import { useDiscountForm } from "../../hooks/use-discount-form";
import { DiscountFormFields } from "./discount-form-fields";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

interface DiscountUpdateFormProps {
	discount: {
		id: string;
		code: string;
		type: DiscountType;
		value: number;
		minOrderAmount: number | null;
		maxUsageCount: number | null;
		maxUsagePerUser: number | null;
		isActive: boolean;
		endsAt: Date | null;
	};
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
	endsAt: "Date de fin",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function DiscountUpdateForm({ discount, className }: DiscountUpdateFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const { form } = useDiscountForm({
		code: discount.code,
		type: discount.type,
		value: discount.value,
		minOrderAmount: discount.minOrderAmount,
		maxUsageCount: discount.maxUsageCount,
		maxUsagePerUser: discount.maxUsagePerUser,
		endsAt: discount.endsAt,
	});

	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateDiscount,

			createToastCallbacks({
				loadingMessage: "Mise à jour du code…",
				successAction: {
					label: "Voir les codes",
					onClick: () => navigateWithTransition(router, LIST_PATH),
				},
				onSuccess: () => {
					haptic("success");
					allowNavigationRef.current?.();
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	// Les messages discount ne sont pas path-préfixés → tout VALIDATION_ERROR serveur est global
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
			aria-label="Formulaire de modification de code promo"
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
					"DiscountUpdateForm",
				);
			}}
		>
			<input type="hidden" name="id" value={discount.id} />

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
