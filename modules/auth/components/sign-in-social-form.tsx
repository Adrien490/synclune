"use client";

import { GoogleIcon } from "@/shared/components/icons";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { ActionStatus } from "@/shared/types/server-action";
import { LoaderCircle, CircleX } from "lucide-react";
import { useSignInSocial } from "@/modules/auth/hooks/use-sign-in-social";

const providers = [
	{
		id: "google",
		name: "Google",
		icon: <GoogleIcon size={20} />,
	},
];

export function SignInSocialForm({ callbackURL }: { callbackURL: string }) {
	const { action, isPending, state } = useSignInSocial();

	return (
		<div className="space-y-3">
			{state?.message && state.status !== ActionStatus.SUCCESS && (
				<Alert variant="destructive" role="alert" aria-live="assertive">
					<CircleX aria-hidden="true" />
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
							aria-busy={isPending}
							className="bg-background/50 hover:bg-background/70 border-border hover:border-primary/30 disabled:hover:border-border group w-full border-2 motion-safe:transition-colors motion-safe:duration-300"
						>
							{isPending ? (
								<LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
							) : (
								<div className="flex w-full items-center justify-center gap-3">
									<span className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-110">
										{provider.icon}
									</span>
									<span className="font-medium">{`Continuer avec ${provider.name}`}</span>
								</div>
							)}
						</Button>
					</form>
				))}
			</div>
		</div>
	);
}
