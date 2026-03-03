"use client";

import { AuthErrorBoundary } from "@/modules/auth/components/auth-error-boundary";
import type { ErrorPageProps } from "@/shared/types/error.types";

export default function InscriptionError({ reset }: ErrorPageProps) {
	return (
		<AuthErrorBoundary
			reset={reset}
			description="Nous n'avons pas pu charger la page d'inscription. Veuillez réessayer."
		/>
	);
}
