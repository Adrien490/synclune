"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { reorderFromOrder } from "@/modules/cart/actions/reorder-from-order";
import { Button } from "@/shared/components/ui/button";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

interface ReorderButtonProps {
	orderId: string;
}

export function ReorderButton({ orderId }: ReorderButtonProps) {
	const router = useRouter();

	const [, action, isPending] = useActionState(
		withCallbacks(
			reorderFromOrder,
			createToastCallbacks({
				onSuccess: () => {
					router.refresh();
				},
			}),
		),
		undefined,
	);

	return (
		<section className="space-y-4">
			<h2 className="text-base font-semibold">Commander à nouveau</h2>
			<div className="border-border/60 border-t pt-4">
				<form action={action}>
					<input type="hidden" name="orderId" value={orderId} />
					<Button
						type="submit"
						variant="outline"
						className="w-full"
						disabled={isPending}
						aria-busy={isPending}
					>
						{isPending ? (
							<>
								<LoaderCircle className="mr-2 size-4 animate-spin" />
								Ajout au panier…
							</>
						) : (
							<>
								<RotateCcw className="mr-2 size-4" />
								Ajouter au panier
							</>
						)}
					</Button>
				</form>
			</div>
		</section>
	);
}
