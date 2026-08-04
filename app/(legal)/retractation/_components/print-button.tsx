"use client";

import { Button } from "@/shared/components/ui/button";
import { PrinterIcon } from "@phosphor-icons/react/ssr";

export function PrintButton() {
	return (
		<Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
			<PrinterIcon className="size-4" />
			Imprimer le formulaire
		</Button>
	);
}
