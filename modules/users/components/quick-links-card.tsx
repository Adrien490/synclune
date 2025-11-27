import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import Link from "next/link";

export function QuickLinksCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Navigation</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<Button variant="outline" className="w-full justify-start" asChild>
					<Link href="/liste-de-souhaits">Ma liste de souhaits</Link>
				</Button>
				<Button variant="outline" className="w-full justify-start" asChild>
					<Link href="/parametres">Paramètres du compte</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
