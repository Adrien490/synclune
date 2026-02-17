"use client";

import { GoogleIcon } from "@/shared/components/icons";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { ActionStatus } from "@/shared/types/server-action";
import { Loader2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSignInSocial } from "@/modules/auth/hooks/use-sign-in-social";

const providers = [
	{
		id: "google",
		name: "Google",
		icon: <GoogleIcon size={20} />,
	},
];

export function SignInSocialForm() {
	const searchParams = useSearchParams();
	const callbackURL = searchParams.get("callbackURL") || "/";
	const { action, isPending, state } = useSignInSocial();

	return (
		<div className="space-y-3">
			{state?.message && state.status !== ActionStatus.SUCCESS && (
				<Alert variant="destructive" role="alert" aria-live="assertive">
					<XCircle aria-hidden="true" />
					<AlertDescription>{state.message}</AlertDescription>
				</Alert>
			)}
			<div className="grid grid-cols-1 gap-3">
				{providers.map((provider) => (
					<form key={provider.id} action={action}>
						<input type="hidden" name="provider" value={provider.id} />
						<input type="hidden" name="callbackURL" value={callbackURL} />
						<Button
							disabled={isPending}
							type="submit"
							variant="outline"
							size="lg"
							className="w-full bg-background/50 transition-all duration-300 hover:bg-background/70 border-2 border-border hover:border-primary/30 disabled:hover:border-border group"
						>
							{isPending ? (
								<Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
							) : (
								<div className="flex items-center justify-center w-full gap-3">
									<span className="transition-transform duration-300 group-hover:scale-110">
										{provider.icon}
									</span>
									<span className="font-medium">
										{`Continuer avec ${provider.name}`}
									</span>
								</div>
							)}
						</Button>
					</form>
				))}
			</div>
		</div>
	);
}
