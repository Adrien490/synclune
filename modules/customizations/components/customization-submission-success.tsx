import { Button } from "@/shared/components/ui/button";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

import type { SubmittedCustomizationData } from "../hooks/use-customization-form";

export function CustomizationSubmissionSuccess({
	data,
}: {
	data: SubmittedCustomizationData | null;
}) {
	return (
		<motion.div
			role="status"
			aria-live="polite"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, delay: 0.1 }}
			className="flex flex-col items-center gap-6 py-12 text-center"
		>
			<CircleCheck className="text-success size-12" strokeWidth={1.5} />

			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">Message envoyé !</h2>
				<p className="text-muted-foreground">Je vous réponds dans les plus brefs délais.</p>
			</div>

			{data && (data.firstName || data.productTypeLabel) && (
				<dl className="bg-muted/50 rounded-lg px-6 py-4 text-left text-sm">
					{data.firstName && (
						<div className="flex gap-2">
							<dt className="text-muted-foreground">Prénom :</dt>
							<dd>{data.firstName}</dd>
						</div>
					)}
					{data.productTypeLabel && (
						<div className="flex gap-2">
							<dt className="text-muted-foreground">Type :</dt>
							<dd>{data.productTypeLabel}</dd>
						</div>
					)}
				</dl>
			)}

			<div className="flex flex-col gap-3 sm:flex-row">
				<Button asChild>
					<Link href="/boutique">Retour à la boutique</Link>
				</Button>
				<Button variant="outline" asChild>
					<Link href="/personnalisation">Envoyer une autre demande</Link>
				</Button>
			</div>
		</motion.div>
	);
}
