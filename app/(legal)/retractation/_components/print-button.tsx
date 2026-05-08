"use client";

import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
	return (
		<Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
			<Printer className="size-4" />
			Imprimer le formulaire
		</Button>
	);
}
