"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

/**
 * Opt-in button for push notifications + periodic background sync.
 *
 * Requires these server-side pieces to be wired:
 * - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (base64url) in env
 * - `POST /api/push/subscribe` endpoint that stores `PushSubscription` JSON on the user
 * - `POST /api/push/unsubscribe` endpoint that removes it
 * - Optional: Periodic Sync tag `wishlist-restock-sync` (Chrome/Edge Android only)
 *
 * On unsupported browsers the component renders null (graceful degradation).
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	const buffer = new ArrayBuffer(raw.length);
	const output = new Uint8Array(buffer);
	for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
	return output;
}

export function PushNotificationsOptIn({ className }: { className?: string }) {
	const [isSupported, setIsSupported] = useState(false);
	const [permission, setPermission] = useState<NotificationPermission>("default");
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (
			!("Notification" in window) ||
			!("serviceWorker" in navigator) ||
			!("PushManager" in window)
		) {
			return;
		}
		if (!vapidKey) return;
		setIsSupported(true);
		setPermission(Notification.permission);

		void navigator.serviceWorker.ready.then(async (reg) => {
			const existing = await reg.pushManager.getSubscription();
			setIsSubscribed(Boolean(existing));
		});
	}, [vapidKey]);

	if (!isSupported || !vapidKey) return null;

	async function handleSubscribe() {
		setIsLoading(true);
		try {
			const perm = await Notification.requestPermission();
			setPermission(perm);
			if (perm !== "granted") return;

			const reg = await navigator.serviceWorker.ready;
			const subscription = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(vapidKey!),
			});

			await fetch("/api/push/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(subscription.toJSON()),
			});

			// Opt-in to periodic sync (best effort — Chrome/Edge Android only)
			const permissions = (
				navigator as Navigator & {
					permissions?: { query: (d: { name: string }) => Promise<{ state: string }> };
				}
			).permissions;
			if (permissions) {
				const status = await permissions
					.query({ name: "periodic-background-sync" })
					.catch(() => ({ state: "denied" }));
				if (status.state === "granted") {
					const periodicSync = (
						reg as ServiceWorkerRegistration & {
							periodicSync?: {
								register: (tag: string, opts: { minInterval: number }) => Promise<void>;
							};
						}
					).periodicSync;
					await periodicSync
						?.register("wishlist-restock-sync", { minInterval: 12 * 60 * 60 * 1000 })
						.catch(() => undefined);
				}
			}

			setIsSubscribed(true);
			triggerHaptic("success");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleUnsubscribe() {
		setIsLoading(true);
		try {
			const reg = await navigator.serviceWorker.ready;
			const subscription = await reg.pushManager.getSubscription();
			if (subscription) {
				await fetch("/api/push/unsubscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ endpoint: subscription.endpoint }),
				}).catch(() => undefined);
				await subscription.unsubscribe();
			}
			setIsSubscribed(false);
			triggerHaptic("light");
		} finally {
			setIsLoading(false);
		}
	}

	if (permission === "denied") {
		return (
			<div
				role="status"
				className={cn("text-muted-foreground flex items-center gap-2 text-sm", className)}
			>
				<BellOff className="size-4" aria-hidden="true" />
				Notifications bloquées — activez-les depuis les réglages du navigateur.
			</div>
		);
	}

	return (
		<Button
			type="button"
			variant={isSubscribed ? "secondary" : "default"}
			onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
			disabled={isLoading}
			className={className}
		>
			{isSubscribed ? (
				<BellOff className="mr-2 size-4" aria-hidden="true" />
			) : (
				<Bell className="mr-2 size-4" aria-hidden="true" />
			)}
			{isSubscribed ? "Désactiver les notifications" : "Activer les notifications"}
		</Button>
	);
}
