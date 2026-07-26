import { formatEuro } from "@/shared/utils/format-euro";
import type { OrderItem, ShippingAddress } from "@/modules/emails/types/email.types";
import { Hr, Link, Section, Text } from "react-email";
import { LEGAL_URLS } from "@/shared/constants/legal-urls";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailColorSwatch, parseSkuColorHexes } from "./_components/email-color-swatch";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";
import { FlexRow } from "./_components/flex-row";

interface OrderConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	total: number;
	shippingAddress: ShippingAddress;
	trackingUrl: string;
	/**
	 * URL directe vers le PDF de la facture (Art. 289-I CGI — mise à disposition
	 * immédiate). Inclut un token signé pour les commandes guest. Optionnel :
	 * absent si la commande n'a pas encore reçu son numéro de facture au moment
	 * de l'envoi (race rare avec le webhook payment_intent.succeeded).
	 */
	invoiceUrl?: string | null;
}

export const OrderConfirmationEmail = ({
	orderNumber,
	customerName,
	items,
	subtotal,
	discount,
	shipping,
	total,
	shippingAddress,
	trackingUrl,
	invoiceUrl,
}: OrderConfirmationEmailProps) => {
	return (
		<EmailLayout preview={`Commande ${orderNumber} confirmée`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Commande confirmée</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre commande est enregistrée.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Numéro de commande
				</Text>
				<Text
					style={{
						margin: "4px 0 0 0",
						fontFamily: "monospace",
						fontSize: "18px",
						fontWeight: "bold",
						color: EMAIL_COLORS.primary,
					}}
				>
					{orderNumber}
				</Text>
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Articles
				</EmailHeading>

				{items.map((item, index) => (
					<FlexRow
						key={index}
						style={{
							marginBottom: "12px",
							paddingBottom: index < items.length - 1 ? "12px" : "0",
							borderBottom: index < items.length - 1 ? `1px solid ${EMAIL_COLORS.border}` : "none",
						}}
						left={
							<>
								<Text
									className={EMAIL_CLASSES.text.body}
									style={{
										margin: 0,
										fontSize: "15px",
										fontWeight: "500",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{item.productTitle}
								</Text>
								<Text
									className={EMAIL_CLASSES.text.secondary}
									style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
								>
									{(() => {
										const hexes = parseSkuColorHexes(item.skuColorHexes);
										const text = [item.skuSize, item.skuColor, item.skuMaterial]
											.filter(Boolean)
											.join(" · ");
										return (
											<>
												{hexes.length > 0 && (
													<EmailColorSwatch hexes={hexes} ariaLabel={item.skuColor ?? undefined} />
												)}
												{text} × {item.quantity}
											</>
										);
									})()}
								</Text>
							</>
						}
						right={
							<Text
								className={EMAIL_CLASSES.text.body}
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "15px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{formatEuro(item.price * item.quantity)}
							</Text>
						}
					/>
				))}

				<Hr style={{ ...EMAIL_STYLES.hr, margin: "16px 0" }} />

				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Sous-total"
					value={formatEuro(subtotal)}
					variant="mono"
				/>
				{discount > 0 && (
					<EmailSummaryRow
						style={{ marginBottom: "8px" }}
						label="Réduction"
						value={`-${formatEuro(discount)}`}
						variant="highlight"
					/>
				)}
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Livraison"
					value={formatEuro(shipping)}
					variant="mono"
				/>

				<Hr style={{ ...EMAIL_STYLES.hr, margin: "12px 0" }} />

				<FlexRow
					left={<EmailHeading level="h3">Total</EmailHeading>}
					right={
						<Text
							style={{
								margin: 0,
								fontFamily: "monospace",
								fontSize: "18px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{formatEuro(total)}
						</Text>
					}
				/>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Livraison
				</EmailHeading>
				<EmailCard>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{ ...EMAIL_STYLES.text.body, margin: 0 }}
					>
						{shippingAddress.firstName} {shippingAddress.lastName}
					</Text>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{shippingAddress.address1}
						{shippingAddress.address2 && `, ${shippingAddress.address2}`}
					</Text>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
						{shippingAddress.postalCode} {shippingAddress.city}, {shippingAddress.country}
					</Text>
				</EmailCard>
			</Section>

			<EmailCTA href={trackingUrl}>Suivre ma commande</EmailCTA>

			{invoiceUrl && (
				<Section style={{ marginTop: "12px", textAlign: "center" }}>
					<Link
						href={invoiceUrl}
						style={{
							color: EMAIL_COLORS.text.secondary,
							textDecoration: "underline",
							fontSize: "14px",
						}}
					>
						Télécharger ma facture (PDF)
					</Link>
				</Section>
			)}

			<Section style={{ marginBottom: "24px" }}>
				<Hr style={{ ...EMAIL_STYLES.hr, margin: "0 0 16px 0" }} />
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de
					14 jours à compter de la réception de votre commande pour exercer votre droit de
					rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
				</Text>
				<Text
					className={EMAIL_CLASSES.text.secondary}
					style={{ ...EMAIL_STYLES.text.small, marginTop: "8px" }}
				>
					<Link
						href={LEGAL_URLS.CGV}
						style={{ color: EMAIL_COLORS.text.secondary, textDecoration: "underline" }}
					>
						Conditions générales de vente
					</Link>
					{" · "}
					<Link
						href={LEGAL_URLS.WITHDRAWAL}
						style={{ color: EMAIL_COLORS.text.secondary, textDecoration: "underline" }}
					>
						Formulaire de rétractation
					</Link>
					{" · "}
					<Link
						href={LEGAL_URLS.PRIVACY}
						style={{ color: EMAIL_COLORS.text.secondary, textDecoration: "underline" }}
					>
						Politique de confidentialité
					</Link>
				</Text>
			</Section>
		</EmailLayout>
	);
};

OrderConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerName: "Marie",
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
	total: 18390,
	shippingAddress: {
		firstName: "Marie",
		lastName: "Dupont",
		address1: "12 Rue de la Paix",
		address2: "Appartement 4B",
		postalCode: "75002",
		city: "Paris",
		country: "France",
	},
	trackingUrl: "https://synclune.fr/commandes/CMD-1704067200000-A1B2C3D4E5F6",
	invoiceUrl:
		"https://synclune.fr/api/orders/CMD-1730000000-ABCD/invoice?token=abc123def456abc123def456abc12345",
} as OrderConfirmationEmailProps;

export default OrderConfirmationEmail;
