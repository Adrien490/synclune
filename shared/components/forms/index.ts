"use client";

import { fieldContext, formContext } from "@/shared/lib/form-context";
import { createFormHook } from "@tanstack/react-form";
import { AutocompleteField } from "./autocomplete-field";
import { CheckboxField } from "./checkbox-field";
import { InputField } from "./input-field";
import { InputGroupField } from "./input-group-field";
import { MultiSelectField } from "./multi-select-field";
import { PasswordInputField } from "./password-input-field";
import { PhoneField } from "./phone-field";
import { RadioGroupField } from "./radio-group-field";
import { RatingField } from "./rating-field";
import { SelectField } from "./select-field";
import { TextareaField } from "./textarea-field";

// Export field and form contexts
export { useFieldContext, useFormContext } from "@/shared/lib/form-context";

// Export UI components (helpers)
export { FieldLabel } from "./field-label";

// Export filter components
export { CheckboxFilterItem } from "./checkbox-filter-item";

// Create the main form hook with all field and form components
export const { useAppForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		AutocompleteField,
		CheckboxField,
		InputField,
		InputGroupField,
		MultiSelectField,
		PasswordInputField,
		PhoneField,
		RadioGroupField,
		RatingField,
		SelectField,
		TextareaField,
	},
	formComponents: {},
});
