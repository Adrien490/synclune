import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Hors ligne",
	description: "Vous etes actuellement hors ligne",
};

export default function OfflinePage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-50 to-white px-4">
			<div className="text-center">
				<div className="mb-6 text-6xl" role="img" aria-label="Hors ligne">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="64"
						height="64"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mx-auto text-pink-400"
						aria-hidden="true"
					>
						<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
						<circle cx="12" cy="12" r="3" />
						<path d="m2 2 20 20" />
					</svg>
				</div>
				<h1 className="mb-4 font-serif text-3xl font-bold text-gray-900">Vous etes hors ligne</h1>
				<p className="mb-8 max-w-md text-gray-600">
					Il semble que vous n&apos;ayez pas de connexion internet. Verifiez votre connexion et
					reessayez.
				</p>
				<Link
					href="/"
					className="inline-flex items-center rounded-full bg-pink-500 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-600 focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:outline-none"
				>
					Reessayer
				</Link>
			</div>
		</div>
	);
}
