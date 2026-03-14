"use client";

import { Button } from "@/shared/components/ui/button";
import { toggleNewsletter } from "@/modules/newsletter/actions/toggle-newsletter";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useActionWithToast } from "@/shared/hooks/use-action-with-toast";

interface NewsletterSettingsCardProps {
	isSubscribed: boolean;
}

export function NewsletterSettingsCard({ isSubscribed }: NewsletterSettingsCardProps) {
	const { action, isPending } = useActionWithToast(toggleNewsletter);

	return (
		<section className="space-y-4" aria-labelledby="newsletter-heading">
			<h2 id="newsletter-heading" className="text-base font-semibold">
				Newsletter
			</h2>
			<div className="border-border/60 border-t pt-4">
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm">
						{isSubscribed ? (
							<>
								<span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
								<span className="text-muted-foreground">Inscrit(e)</span>
							</>
						) : (
							<>
								<span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" />
								<span className="text-muted-foreground">Non inscrit(e)</span>
							</>
						)}
					</div>
					<form action={action}>
						<input type="hidden" name="action" value={isSubscribed ? "unsubscribe" : "subscribe"} />
						<Button
							type="submit"
							variant={isSubscribed ? "outline" : "default"}
							className="w-full"
							disabled={isPending}
						>
							{isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : isSubscribed ? (
								<BellOff className="mr-2 h-4 w-4" />
							) : (
								<Bell className="mr-2 h-4 w-4" />
							)}
							{isPending ? "Traitement..." : isSubscribed ? "Se désinscrire" : "S'inscrire"}
						</Button>
					</form>
				</div>
			</div>
		</section>
	);
}
