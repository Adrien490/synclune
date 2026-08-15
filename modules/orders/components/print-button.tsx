"use client";

import { PrinterIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/shared/components/ui/button";

/** Impression navigateur — la « facture » est un rendu HTML, pas un PDF (D2). */
export function PrintButton() {
	return (
		<Button onClick={() => window.print()} className="print:hidden">
			<PrinterIcon aria-hidden="true" />
			Imprimer / Enregistrer en PDF
		</Button>
	);
}
