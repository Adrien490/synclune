"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { updateColor } from "@/modules/colors/actions/update-color";
import { ColorFormFields } from "@/modules/colors/components/admin/color-form-fields";
import { useColorForm } from "@/modules/colors/hooks/use-color-form";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/with-view-transition";

export interface EditableColor {
	id: string;
	name: string;
	slug: string;
	hex: string;
}

interface EditColorFormProps {
	color: EditableColor;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

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

	const form = useColorForm({ name: color.name, hex: color.hex });

	const isDirty = form.state.isDirty;
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateColor,
			// eslint-disable-next-line react-hooks/refs -- callback is invoked after submit, not during render
			createToastCallbacks({
				loadingMessage: "Mise à jour de la couleur…",
				onSuccess: () => {
					haptic("success");
					allowNavigationRef.current?.();
					onSuccess?.();
					if (redirectOnSuccess) {
						setTimeout(
							() => withViewTransition(() => router.push("/admin/catalogue/couleurs")),
							FORM_SUCCESS_REDIRECT_DELAY_MS,
						);
					}
				},
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	// Mobile : pas de garde unsaved-changes (les confirms beforeunload/popstate
	// natifs sont peu utiles sur mobile et entrent en conflit avec les gestes
	// swipe-back iOS / Android — UX moins bonne que la perte de saisie).
	const { allowNavigation } = useUnsavedChanges(isDirty, !isPending && !isMobile);

	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	return (
		<form
			ref={formRef}
			action={action}
			className={cn("space-y-6", className)}
			onInvalidCapture={onInvalidCapture}
			onSubmit={(event) => {
				if (!form.state.canSubmit) {
					event.preventDefault();
					focusFirstInvalid();
					return;
				}
				void form.handleSubmit();
			}}
		>
			<input type="hidden" name="id" value={color.id} />

			<RequiredFieldsNote />

			<ColorFormFields form={form} isPending={isPending} />

			<AdminFormFooter pending={isPending}>
				<div className="flex justify-end">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<Button disabled={!canSubmit || isPending} type="submit">
								{isPending ? "Enregistrement…" : "Enregistrer"}
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
