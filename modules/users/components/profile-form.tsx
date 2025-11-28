"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useUpdateProfile } from "@/modules/users/hooks/use-update-profile";
import { GetCurrentUserReturn } from "@/modules/users/data/get-current-user";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
	user: GetCurrentUserReturn;
}

export function ProfileForm({ user }: ProfileFormProps) {
	const router = useRouter();
	const { action, isPending } = useUpdateProfile({
		onSuccess: () => {
			router.refresh();
		},
	});

	return (
		<form action={action} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">Prénom</Label>
				<Input
					id="name"
					name="name"
					type="text"
					defaultValue={user?.name || ""}
					disabled={isPending}
					required
					minLength={2}
					maxLength={100}
				/>
				<p className="text-sm text-muted-foreground">
					Ce prénom sera utilisé pour vos commandes et communications
				</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="email">Email</Label>
				<Input
					id="email"
					type="email"
					value={user?.email || ""}
					disabled
					className="bg-muted cursor-not-allowed"
				/>
				<p className="text-sm text-muted-foreground">
					L&apos;adresse email ne peut pas être modifiée
				</p>
			</div>

			<Button type="submit" disabled={isPending}>
				{isPending ? "Enregistrement..." : "Enregistrer les modifications"}
			</Button>
		</form>
	);
}
