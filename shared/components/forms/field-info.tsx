import { AnyFieldApi } from "@tanstack/react-form";
import { ReactNode } from "react";

type Props = {
	field: AnyFieldApi;
	additionalInfo?: ReactNode;
};

export function FieldInfo({ field, additionalInfo }: Props) {
	return (
		<>
			{field.state.meta.isTouched && field.state.meta.errors.length ? (
				<em role="alert" className="text-xs text-destructive">
					{field.state.meta.errors.join(", ")}
				</em>
			) : null}
			{field.state.meta.isValidating ? (
				<span className="text-xs text-muted-foreground">Validation...</span>
			) : null}
			{additionalInfo}
		</>
	);
}
