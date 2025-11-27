"use client";

import { GoogleIcon } from "@/shared/components/icons";
import { Button } from "@/shared/components/ui/button";
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
	const { action, isPending } = useSignInSocial();

	return (
		<div className="space-y-3">
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
							<div className="flex items-center justify-center w-full gap-3">
								<span className="transition-transform duration-300 group-hover:scale-110">
									{provider.icon}
								</span>
								<span className="font-medium">
									{`Continuer avec ${provider.name}`}
								</span>
							</div>
						</Button>
					</form>
				))}
			</div>
		</div>
	);
}
