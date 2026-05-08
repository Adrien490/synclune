"use client";

import { useActionState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Download, LoaderCircle } from "lucide-react";
import { exportSingleOrder } from "@/modules/orders/actions/export-single-order";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface ExportSingleOrderButtonProps {
	orderId: string;
}

export function ExportSingleOrderButton({ orderId }: ExportSingleOrderButtonProps) {
	const [, action, isPending] = useActionState(
		withCallbacks(
			exportSingleOrder,
			createToastCallbacks({
				loadingMessage: "Export en cours…",
				onSuccess: (state) => {
					if (!state.csv || !state.filename) return;
					const blob = new Blob([state.csv], { type: "text/csv;charset=utf-8" });
					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = state.filename;
					link.click();
					URL.revokeObjectURL(url);
				},
			}),
		),
		undefined,
	);

	return (
		<form action={action} className="inline">
			<input type="hidden" name="id" value={orderId} />
			<Button type="submit" variant="outline" size="sm" disabled={isPending} aria-busy={isPending}>
				{isPending ? (
					<LoaderCircle className="mr-2 size-4 animate-spin" />
				) : (
					<Download className="mr-2 size-4" />
				)}
				{isPending ? "Export…" : "Exporter CSV"}
			</Button>
		</form>
	);
}
