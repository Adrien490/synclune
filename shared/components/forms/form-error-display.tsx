import { useFormContext } from "@/shared/lib/form-context";

export function FormErrorDisplay() {
	const form = useFormContext();

	return (
		<form.Subscribe selector={(state) => state.errorMap}>
			{(errorMap) =>
				errorMap.onSubmit ? (
					<div
						role="alert"
						className="p-3 bg-destructive/10 border border-destructive/20 rounded-md animate-in fade-in-0 slide-in-from-top-1 duration-200"
					>
						<p className="text-sm text-destructive">{errorMap.onSubmit}</p>
					</div>
				) : null
			}
		</form.Subscribe>
	);
}
