"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { createDiscount } from "@/modules/discounts/actions/create-discount";
import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { useDiscountForm } from "../../hooks/use-discount-form";
import { DiscountFormFields } from "./discount-form-fields";

interface CreateDiscountFormProps {
	className?: string;
}

export function CreateDiscountForm({ className }: CreateDiscountFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const { formRef, focusFirstInvalid } = useFocusFirstError();
	const { form } = useDiscountForm();

	const [, action, isPending] = useActionState(
		withCallbacks(
			createDiscount,
			createToastCallbacks({
				loadingMessage: "Création du code…",
				onSuccess: () => {
					haptic("success");
					form.reset();
					withViewTransition(() => router.push("/admin/marketing/discounts"));
				},
				onError: () => {
					haptic("error");
				},
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
			className={className}
		>
			<div className="space-y-6">
				<RequiredFieldsNote />
				<DiscountFormFields form={form} isPending={isPending} />
			</div>

			<AdminFormFooter pending={isPending} className="mt-6">
				<div className="flex justify-end">
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
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
								<span>{isPending ? "Création…" : "Créer"}</span>
							</Button>
						)}
					</form.Subscribe>
				</div>
			</AdminFormFooter>
		</form>
	);
}
