"use client";

import { fieldContext, formContext } from "@/shared/lib/form-context";
import { createFormHook } from "@tanstack/react-form";
import { CheckboxField } from "./checkbox-field";
import { FormErrorDisplay } from "./form-error-display";
import { InputField } from "./input-field";
import { InputGroupField } from "./input-group-field";
import { RadioGroupField } from "./radio-group-field";
import { SelectField } from "./select-field";
import { TextareaField } from "./textarea-field";
import { TextareaGroupField } from "./textarea-group-field";

// Export field and form contexts
export { useFieldContext, useFormContext } from "@/shared/lib/form-context";

// Export UI components (layout and helpers)
export { FieldLabel } from "./field-label";
export { FormFooter } from "./form-footer";
export { FormLayout } from "./form-layout";
export { FormSection } from "./form-section";

// Create the main form hook with all field and form components
export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		InputField,
		InputGroupField,
		SelectField,
		CheckboxField,
		TextareaField,
		TextareaGroupField,
		RadioGroupField,
	},
	formComponents: {
		FormErrorDisplay,
	},
});
