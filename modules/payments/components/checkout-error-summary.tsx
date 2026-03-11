"use client";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FieldError {
	name: string;
	label: string;
	message: string;
}

interface CheckoutErrorSummaryProps {
	fieldErrors: FieldError[];
}

export function CheckoutErrorSummary({ fieldErrors }: CheckoutErrorSummaryProps) {
	if (fieldErrors.length === 0) return null;

	return (
		<Alert variant="destructive" role="alert" aria-live="assertive">
			<AlertCircle className="size-4" />
			<AlertTitle>
				{fieldErrors.length === 1 ? "1 erreur trouvée" : `${fieldErrors.length} erreurs trouvées`}
			</AlertTitle>
			<AlertDescription>
				<ul className="mt-1 space-y-1">
					{fieldErrors.map(({ name, label, message }) => (
						<li key={name}>
							<button
								type="button"
								className="underline hover:no-underline"
								onClick={() => {
									const el = document.getElementById(name);
									if (el) {
										el.scrollIntoView({
											behavior: "smooth",
											block: "center",
										});
										el.focus({ preventScroll: true });
									}
								}}
							>
								{label}
							</button>{" "}
							: {message}
						</li>
					))}
				</ul>
			</AlertDescription>
		</Alert>
	);
}
