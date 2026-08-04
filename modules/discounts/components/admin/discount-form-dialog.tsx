"use client";

import { type DiscountType } from "@/app/generated/prisma/browser";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { useActionState, useEffect } from "react";

import { createDiscount } from "@/modules/discounts/actions/create-discount";
import { updateDiscount } from "@/modules/discounts/actions/update-discount";

import { getDiscountFormDefaults, useDiscountForm } from "../../hooks/use-discount-form";
import { DiscountFormFields } from "./discount-form-fields";

export const DISCOUNT_DIALOG_ID = "discount-form";

interface DiscountDialogData extends Record<string, unknown> {
	discount?: {
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
}

export function DiscountFormDialog() {
	const { isOpen, close, data } = useDialog<DiscountDialogData>(DISCOUNT_DIALOG_ID);
	const discount = data?.discount;
	const isUpdateMode = !!discount;
	const haptic = useHaptic();
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	const { form } = useDiscountForm();

	const [createState, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createDiscount,
			createToastCallbacks({
				loadingMessage: "Création du code…",
				onSuccess: () => {
					haptic("success");
					close();
					form.reset();
				},
				onError: () => {
					haptic("error");
				},
			}),
		),
		undefined,
	);

	const [updateState, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateDiscount,
			createToastCallbacks({
				loadingMessage: "Mise à jour du code…",
				onSuccess: () => {
					haptic("success");
					close();
				},
				onError: () => {
					haptic("error");
				},
			}),
		),
		undefined,
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	// `createToastCallbacks` retire les VALIDATION_ERROR du toast (affichage inline
	// supposé) : sans cette alerte, un refus de `createDiscountSchema` serait muet.
	const serverErrors = useServerFieldErrors({
		state: isUpdateMode ? updateState : createState,
	});

	// Reset form values when discount data changes (open/close + edit different discount)
	useEffect(() => {
		form.reset(getDiscountFormDefaults(discount ?? null));
	}, [discount, form]);

	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<ResponsiveDialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier le code promo" : "Créer un code promo"}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{isUpdateMode
							? "Modifiez les paramètres du code promo existant"
							: "Configurez un nouveau code promo pour vos clients"}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form
					ref={formRef}
					action={action}
					onSubmit={(event) => {
						if (!form.state.canSubmit) {
							event.preventDefault();
							focusFirstInvalid();
						}
					}}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="flex-1 gap-y-6 overflow-y-auto pr-2">
						{isUpdateMode && <input type="hidden" name="id" value={discount!.id} />}

						<FormServerErrorAlert errors={serverErrors} className="mb-4" />

						<RequiredFieldsNote />

						<DiscountFormFields form={form} isPending={isPending} />
					</div>

					<div className="mt-4 flex shrink-0 justify-end pt-4 pr-[max(0rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0rem,env(safe-area-inset-left))]">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending ? "Enregistrement…" : isUpdateMode ? "Enregistrer" : "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
