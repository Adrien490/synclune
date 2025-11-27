import { useFormContext } from "@/shared/lib/form-context";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";

interface SubmitButtonProps {
	label?: string;
	loadingLabel?: string;
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	className?: string;
}

export function SubmitButton({
	label = "Envoyer",
	loadingLabel = "Envoi...",
	variant = "default",
	className,
}: SubmitButtonProps) {
	const form = useFormContext();

	return (
		<form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
			{([canSubmit, isSubmitting]) => (
				<Button
					type="submit"
					variant={variant}
					disabled={!canSubmit || isSubmitting}
					className={className}
				>
					{isSubmitting ? (
						<>
							<Loader2
								className="mr-2 h-4 w-4 animate-spin"
								aria-hidden="true"
							/>
							{loadingLabel}
						</>
					) : (
						label
					)}
				</Button>
			)}
		</form.Subscribe>
	);
}
