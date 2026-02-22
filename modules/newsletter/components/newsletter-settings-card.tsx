"use client";

import { Button } from "@/shared/components/ui/button";
import { toggleNewsletter } from "@/modules/newsletter/actions/toggle-newsletter";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { ActionStatus } from "@/shared/types/server-action";

interface NewsletterSettingsCardProps {
	isSubscribed: boolean;
}

export function NewsletterSettingsCard({
	isSubscribed,
}: NewsletterSettingsCardProps) {
	const [state, action, isPending] = useActionState(toggleNewsletter, undefined);

	useEffect(() => {
		if (state?.status === ActionStatus.SUCCESS && state.message) {
			toast.success(state.message);
		} else if (state?.status && state.status !== ActionStatus.SUCCESS && state.message) {
			toast.error(state.message);
		}
	}, [state]);

	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-base font-semibold flex items-center gap-2">
					<Bell className="size-4 text-muted-foreground" />
					Newsletter
				</h2>
				<p className="text-sm text-muted-foreground mt-0.5">
					Recevez nos nouveautés et offres exclusives
				</p>
			</div>
			<div className="border-t border-border/60 pt-4">
				<div className="space-y-3">
					<div className="flex items-center gap-2 text-sm">
						{isSubscribed ? (
							<>
								<span className="h-2 w-2 rounded-full bg-green-500" />
								<span className="text-muted-foreground">Inscrit(e)</span>
							</>
						) : (
							<>
								<span className="h-2 w-2 rounded-full bg-gray-400" />
								<span className="text-muted-foreground">Non inscrit(e)</span>
							</>
						)}
					</div>
					<form action={action}>
						<input
							type="hidden"
							name="action"
							value={isSubscribed ? "unsubscribe" : "subscribe"}
						/>
						<Button
							type="submit"
							variant={isSubscribed ? "outline" : "default"}
							className="w-full"
							disabled={isPending}
						>
							{isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : isSubscribed ? (
								<BellOff className="h-4 w-4 mr-2" />
							) : (
								<Bell className="h-4 w-4 mr-2" />
							)}
							{isPending
								? "Traitement..."
								: isSubscribed
									? "Se désinscrire"
									: "S'inscrire"}
						</Button>
					</form>
				</div>
			</div>
		</section>
	);
}
