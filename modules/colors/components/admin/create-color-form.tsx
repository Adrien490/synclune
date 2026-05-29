"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createColor } from "@/modules/colors/actions/create-color";
import { ColorFormFields } from "@/modules/colors/components/admin/color-form-fields";
import {
	ColorFormErrorSummary,
	ColorFormSubmit,
} from "@/modules/colors/components/admin/color-form-frame";
import { ColorLibrarySheet } from "@/modules/colors/components/admin/color-library-sheet";
import { useColorForm } from "@/modules/colors/hooks/use-color-form";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { pushRecentColor } from "@/shared/hooks/use-recent-colors";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface CreateColorFormProps {
	onSuccess?: () => void;
	onCreated?: (id: string) => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

const LIST_PATH = "/admin/catalogue/couleurs";

export function CreateColorForm({
	onSuccess,
	onCreated,
	redirectOnSuccess = true,
	className,
}: CreateColorFormProps = {}) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const form = useColorForm({ name: "", hex: "", description: "", isActive: true });

	const isDirty = form.state.isDirty;
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [, action, isPending] = useActionState(
		withCallbacks(
			createColor,

			createToastCallbacks({
				loadingMessage: "Création de la couleur…",
				successAction: redirectOnSuccess
					? {
							label: "Voir les couleurs",
							onClick: () => withViewTransition(() => router.push(LIST_PATH)),
						}
					: undefined,
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"data" in result &&
						result.data &&
						typeof result.data === "object" &&
						"id" in result.data &&
						typeof result.data.id === "string"
					) {
						onCreated?.(result.data.id);
					}
					pushRecentColor(form.getFieldValue("hex"));
					haptic("success");
					allowNavigationRef.current?.();
					form.reset();
					onSuccess?.();
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

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
			aria-label="Formulaire de création de couleur"
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				event.preventDefault();
				if (isPending || form.state.isSubmitting) return;
				const formData = new FormData(event.currentTarget);
				void form.handleSubmit().then(() => {
					if (form.state.isValid) {
						action(formData);
					} else {
						requestAnimationFrame(() => focusFirstInvalid());
					}
				});
			}}
		>
			<ColorFormErrorSummary form={form} />

			<fieldset disabled={isPending} className="space-y-6">
				<RequiredFieldsNote />

				<ColorLibrarySheet
					disabled={isPending}
					onSelect={(entry) => {
						form.setFieldValue("name", entry.name);
						form.setFieldValue("hex", entry.hex);
						form.setFieldValue("description", entry.description ?? "");
						haptic("success");
					}}
				/>

				<ColorFormFields form={form} isPending={isPending} />
			</fieldset>

			<ColorFormSubmit
				form={form}
				isPending={isPending}
				idleLabel="Créer la couleur"
				pendingLabel="Création…"
			/>
		</form>
	);
}
