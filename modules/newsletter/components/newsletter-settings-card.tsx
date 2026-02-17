"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
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
		<Card>
			<CardHeader>
				<CardTitle className="text-lg flex items-center gap-2">
					<Bell className="w-5 h-5" />
					Newsletter
				</CardTitle>
				<CardDescription>
					Recevez nos nouveautés et offres exclusives
				</CardDescription>
			</CardHeader>
			<CardContent>
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
			</CardContent>
		</Card>
	);
}
