"use client";

import { useActionState } from "react";

import { type DiscountType } from "@/app/generated/prisma/browser";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateDiscount } from "@/modules/discounts/actions/update-discount";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";

import { useDiscountForm } from "../../hooks/use-discount-form";
import { DiscountFormFields } from "./discount-form-fields";

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
		startsAt: Date | null;
		endsAt: Date | null;
	};
}

export function DiscountUpdateForm({ discount }: DiscountUpdateFormProps) {
	const haptic = useHaptic();
	const { formRef, focusFirstInvalid } = useFocusFirstError();
	const { form } = useDiscountForm({
		code: discount.code,
		type: discount.type,
		value: discount.value,
		minOrderAmount: discount.minOrderAmount,
		maxUsageCount: discount.maxUsageCount,
		maxUsagePerUser: discount.maxUsagePerUser,
		startsAt: discount.startsAt,
		endsAt: discount.endsAt,
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateDiscount,
			createToastCallbacks({
				loadingMessage: "Mise à jour du code…",
				onSuccess: () => haptic("success"),
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	return (
		<form
			ref={formRef}
			action={action}
			onSubmit={(event) => {
				if (!form.state.canSubmit) {
					event.preventDefault();
					focusFirstInvalid();
				}
			}}
		>
			<input type="hidden" name="id" value={discount.id} />

			<div className="flex flex-col gap-6">
				<RequiredFieldsNote />
				<DiscountFormFields form={form} isPending={isPending} />
			</div>

			<AdminFormFooter pending={isPending} className="mt-6">
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
