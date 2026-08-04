"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { updateColor } from "@/modules/colors/actions/update-color";
import { ColorFormFields } from "@/modules/colors/components/admin/color-form-fields";
import {
	ColorFormErrorSummary,
	ColorFormSubmit,
} from "@/modules/colors/components/admin/color-form-frame";
import { useColorForm } from "@/modules/colors/hooks/use-color-form";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { pushRecentColor } from "@/shared/hooks/use-recent-colors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/view-transition";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

export interface EditableColor {
	id: string;
	name: string;
	slug: string;
	hex: string;
	description: string | null;
	isActive: boolean;
}

interface EditColorFormProps {
	color: EditableColor;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

const LIST_PATH = "/admin/catalogue/couleurs";

export function EditColorForm({
	color,
	onSuccess,
	redirectOnSuccess = true,
	className,
}: EditColorFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useColorForm({
		name: color.name,
		hex: color.hex,
		description: color.description ?? "",
		isActive: color.isActive,
	});

	const isDirty = form.state.isDirty;
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [state, action, isPending] = useActionState(
		withCallbacks(
			updateColor,

			createToastCallbacks({
				loadingMessage: "Mise à jour de la couleur…",
				successAction: redirectOnSuccess
					? {
							label: "Voir les couleurs",
							onClick: () => withViewTransition(() => router.push(LIST_PATH)),
						}
					: undefined,
				onSuccess: () => {
					pushRecentColor(form.getFieldValue("hex"));
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

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending);

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
			aria-label="Formulaire de modification de couleur"
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
							formData.set("isActive", String(form.getFieldValue("isActive")));
							action(formData);
						} else {
							requestAnimationFrame(() => focusFirstInvalid());
						}
					},
					"EditColorForm",
				);
			}}
		>
			<input type="hidden" name="id" value={color.id} />

			<FormServerErrorAlert errors={serverErrors} />

			<ColorFormErrorSummary form={form} />

			<fieldset disabled={isPending} className="space-y-6">
				<RequiredFieldsNote />

				<ColorFormFields form={form} isPending={isPending} showStatus />
			</fieldset>

			<ColorFormSubmit
				form={form}
				isPending={isPending}
				idleLabel="Enregistrer"
				pendingLabel="Mise à jour…"
			/>
		</form>
	);
}
