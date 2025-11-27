import { formatEuro } from "@/shared/utils/format-euro";
import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { emailTailwindConfig } from "./email-tailwind-config";

interface OrderItem {
	productTitle: string;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	quantity: number;
	price: number;
}

interface AdminNewOrderEmailProps {
	orderNumber: string;
	orderId: string;
	customerName: string;
	customerEmail: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	total: number;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
		phone: string;
	};
	dashboardUrl: string;
	stripePaymentIntentId?: string;
}

export const AdminNewOrderEmail = ({
	orderNumber,
	orderId,
	customerName,
	customerEmail,
	items,
	subtotal,
	discount,
	shipping,
	tax,
	total,
	shippingAddress,
	dashboardUrl,
	stripePaymentIntentId,
}: AdminNewOrderEmailProps) => {
	const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<Html>
			<Head />
			<Preview>
				Nouvelle commande {orderNumber} - {formatEuro(total)}
			</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-background font-sans">
					<Container className="mx-auto my-8 max-w-[600px] rounded-lg border border-border bg-card px-8 py-10">
						{/* Header */}
						<Section className="mb-8 text-center">
							<Text className="m-0 text-2xl font-bold" style={{ color: "#D4A574" }}>
								Nouvelle Commande !
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								Dashboard Admin
							</Text>
						</Section>

						{/* Résumé rapide */}
						<Section className="mb-8 rounded-md bg-secondary/10 p-4">
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text className="m-0 text-sm font-medium text-muted-foreground">
									Commande
								</Text>
								<Text className="m-0 font-mono text-sm font-bold" style={{ color: "#C73767" }}>
									{orderNumber}
								</Text>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text className="m-0 text-sm font-medium text-muted-foreground">
									Montant
								</Text>
								<Text className="m-0 font-mono text-sm font-bold text-foreground">
									{formatEuro(total)}
								</Text>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<Text className="m-0 text-sm font-medium text-muted-foreground">
									Articles
								</Text>
								<Text className="m-0 text-sm font-bold text-foreground">
									{totalItems} article{totalItems > 1 ? "s" : ""}
								</Text>
							</div>
						</Section>

						{/* Client */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Client
							</Text>
							<div className="rounded-md bg-muted p-4">
								<Text className="m-0 text-base font-medium text-foreground">
									{customerName}
								</Text>
								<Text className="m-0 mt-1 text-sm text-muted-foreground">
									{customerEmail}
								</Text>
								<Text className="m-0 mt-1 text-sm text-muted-foreground">
									{shippingAddress.phone}
								</Text>
							</div>
						</Section>

						{/* Adresse */}
						<Section className="mb-8">
							<Text className="m-0 mb-3 text-lg font-semibold text-foreground">
								Adresse de livraison
							</Text>
							<div className="rounded-md bg-muted p-4">
								<Text className="m-0 text-base text-foreground">
									{shippingAddress.firstName} {shippingAddress.lastName}
								</Text>
								<Text className="m-0 mt-1 text-sm text-muted-foreground">
									{shippingAddress.address1}
								</Text>
								{shippingAddress.address2 && (
									<Text className="m-0 text-sm text-muted-foreground">
										{shippingAddress.address2}
									</Text>
								)}
								<Text className="m-0 mt-1 text-sm text-muted-foreground">
									{shippingAddress.postalCode} {shippingAddress.city}
								</Text>
								<Text className="m-0 text-sm text-muted-foreground">
									{shippingAddress.country}
								</Text>
							</div>
						</Section>

						{/* Articles */}
						<Section className="mb-8">
							<Text className="m-0 mb-4 text-lg font-semibold text-foreground">
								Articles
							</Text>

							{items.map((item, index) => (
								<div key={index}>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: "12px",
											paddingBottom: "12px",
											borderBottom:
												index < items.length - 1 ? "1px solid #EFEFEF" : "none",
										}}
									>
										<div style={{ flex: 1 }}>
											<Text className="m-0 text-base font-medium text-foreground">
												{item.productTitle}
											</Text>
											{item.skuSize && (
												<Text className="m-0 mt-1 text-sm text-muted-foreground">
													Taille: {item.skuSize}
												</Text>
											)}
											{item.skuColor && (
												<Text className="m-0 text-sm text-muted-foreground">
													Couleur: {item.skuColor}
												</Text>
											)}
											{item.skuMaterial && (
												<Text className="m-0 text-sm text-muted-foreground">
													Matière: {item.skuMaterial}
												</Text>
											)}
											<Text className="m-0 mt-1 text-sm font-semibold" style={{ color: "#C73767" }}>
												Qté: {item.quantity}
											</Text>
										</div>
										<div style={{ textAlign: "right", paddingLeft: "16px" }}>
											<Text className="m-0 font-mono text-base font-semibold text-foreground">
												{formatEuro(item.price * item.quantity)}
											</Text>
										</div>
									</div>
								</div>
							))}

							<Hr className="my-6" style={{ borderColor: "#E8E8E8" }} />

							<div style={{ marginTop: "16px" }}>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text className="m-0 text-sm text-muted-foreground">
										Sous-total
									</Text>
									<Text className="m-0 font-mono text-sm text-foreground">
										{formatEuro(subtotal)}
									</Text>
								</div>
								{discount > 0 && (
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: "8px",
										}}
									>
										<Text className="m-0 text-sm text-muted-foreground">
											Réduction
										</Text>
										<Text className="m-0 font-mono text-sm text-green-600">
											-{formatEuro(discount)}
										</Text>
									</div>
								)}
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text className="m-0 text-sm text-muted-foreground">
										Frais de port
									</Text>
									<Text className="m-0 font-mono text-sm text-foreground">
										{formatEuro(shipping)}
									</Text>
								</div>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "16px",
									}}
								>
									<Text className="m-0 text-xs text-muted-foreground">
										dont TVA (20%)
									</Text>
									<Text className="m-0 font-mono text-xs text-muted-foreground">
										{formatEuro(tax)}
									</Text>
								</div>

								<Hr className="my-4" style={{ borderColor: "#E8E8E8" }} />

								<div style={{ display: "flex", justifyContent: "space-between" }}>
									<Text className="m-0 text-lg font-bold text-foreground">
										Total TTC
									</Text>
									<Text className="m-0 font-mono text-lg font-bold" style={{ color: "#D4A574" }}>
										{formatEuro(total)}
									</Text>
								</div>
							</div>
						</Section>

						{/* Paiement */}
						{stripePaymentIntentId && (
							<Section className="mb-8">
								<div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
									<Text className="m-0 text-sm font-medium text-green-700">
										Paiement confirmé via Stripe
									</Text>
									<Text className="m-0 mt-1 font-mono text-xs text-muted-foreground">
										{stripePaymentIntentId}
									</Text>
								</div>
							</Section>
						)}

						{/* CTA */}
						<Section className="mb-8 text-center">
							<Button
								href={dashboardUrl}
								style={{ backgroundColor: "#D4A574" }} className="inline-block rounded-md px-8 py-4 text-base font-semibold text-white no-underline"
							>
								Voir dans le Dashboard
							</Button>
						</Section>

						{/* Instructions */}
						<Section className="mb-6 rounded-md border border-border bg-muted p-4">
							<Text className="m-0 text-sm font-medium text-foreground">
								Prochaines étapes
							</Text>
							<Text className="m-0 mt-2 text-sm text-muted-foreground">
								1. Vérifier la disponibilité
								<br />
								2. Préparer la commande
								<br />
								3. Mettre à jour le statut
								<br />
								4. Générer l'étiquette d'expédition
								<br />
								5. Envoyer le numéro de suivi au client
							</Text>
						</Section>

						{/* Footer */}
						<Section className="border-t pt-6" style={{ borderColor: "#E8E8E8" }}>
							<Text className="m-0 text-center text-xs text-muted-foreground">
								Notification - Synclune Dashboard
								<br />
								Order ID: <span className="font-mono">{orderId}</span>
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

AdminNewOrderEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	orderId: "clxxx12345",
	customerName: "Marie Dupont",
	customerEmail: "marie.dupont@example.com",
	items: [
		{
			productTitle: "Collier Luna en Or Rose",
			skuColor: "Or Rose",
			skuMaterial: "Or 18 carats",
			skuSize: "45cm",
			quantity: 1,
			price: 8900,
		},
		{
			productTitle: "Boucles d'oreilles Étoile",
			skuColor: "Argent",
			skuMaterial: "Argent 925",
			skuSize: null,
			quantity: 2,
			price: 4500,
		},
	],
	subtotal: 17900,
	discount: 0,
	shipping: 490,
	tax: 3065,
	total: 18390,
	shippingAddress: {
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "France",
		phone: "+33 6 12 34 56 78",
	},
	dashboardUrl: "https://synclune.fr/dashboard/orders/clxxx12345",
	stripePaymentIntentId: "pi_1234567890abcdefghij",
} as AdminNewOrderEmailProps;

export default AdminNewOrderEmail;
