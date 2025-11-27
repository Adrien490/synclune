import { useFormContext } from "@/shared/lib/form-context";

export function FormErrorDisplay() {
	const form = useFormContext();

	return (
		<form.Subscribe selector={(state) => state.errorMap}>
			{(errorMap) =>
				errorMap.onSubmit ? (
					<div
						role="alert"
						className="p-3 bg-destructive/10 border border-destructive/20 rounded-md"
					>
						<p className="text-sm text-destructive">{errorMap.onSubmit}</p>
					</div>
				) : null
			}
		</form.Subscribe>
	);
}
