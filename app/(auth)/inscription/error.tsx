"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import type { ErrorPageProps } from "@/shared/types/error.types";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function InscriptionError({ reset }: ErrorPageProps) {
	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="w-full max-w-md space-y-6 text-center">
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Une erreur est survenue lors du chargement de la page d'inscription.
					</AlertDescription>
				</Alert>
				<Button onClick={reset} variant="outline">
					<RefreshCw className="mr-2 h-4 w-4" />
					Réessayer
				</Button>
			</div>
		</div>
	);
}
