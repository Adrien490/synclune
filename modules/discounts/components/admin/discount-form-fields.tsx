"use client";

import { type DiscountFormInstance } from "../../hooks/use-discount-form";

import { DiscountCodeSection } from "./discount-code-section";
import { DiscountConditionsSection } from "./discount-conditions-section";
import { DiscountValiditySection } from "./discount-validity-section";

interface DiscountFormFieldsProps {
	form: DiscountFormInstance;
	isPending: boolean;
}

/**
 * Orchestrateur des 3 sections du formulaire discount.
 * Partagé entre create-discount-form, discount-update-form et discount-form-dialog.
 */
export function DiscountFormFields({ form, isPending }: DiscountFormFieldsProps) {
	return (
		<div className="space-y-6">
			<DiscountCodeSection form={form} isPending={isPending} />
			<DiscountConditionsSection form={form} isPending={isPending} />
			<DiscountValiditySection form={form} isPending={isPending} />
		</div>
	);
}
