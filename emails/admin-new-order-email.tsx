import { formatEuro } from "@/shared/utils/format-euro";
import type { AdminShippingAddress, OrderItem } from "@/modules/emails/types/email.types";
import { Hr, Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";
import { FlexRow } from "./_components/flex-row";

interface AdminNewOrderEmailProps {
	orderNumber: string;
	customerName: string;
	customerEmail: string;
	items: OrderItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	total: number;
	shippingAddress: AdminShippingAddress;
	dashboardUrl: string;
}

export const AdminNewOrderEmail = ({
	orderNumber,
	customerName,
	customerEmail,
	items,
	subtotal,
	discount,
	shipping,
	total,
	shippingAddress,
	dashboardUrl,
}: AdminNewOrderEmailProps) => {
	const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<EmailLayout
			preview={`Nouvelle commande ${orderNumber} - ${formatEuro(total)}`}
			headerText="Nouvelle Commande"
		>
			<EmailCard style={{ marginBottom: "24px" }}>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Commande"
					value={orderNumber}
					variant="highlight"
				/>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Montant"
					value={formatEuro(total)}
					variant="mono"
				/>
				<EmailSummaryRow
					label="Articles"
					value={
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "14px",
								fontWeight: "bold",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{totalItems} article{totalItems > 1 ? "s" : ""}
						</Text>
					}
				/>
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Client
				</EmailHeading>
				<EmailCard>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{
							margin: 0,
							fontSize: "14px",
							fontWeight: "600",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{customerName}
					</Text>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{customerEmail}
					</Text>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{shippingAddress.phone}
					</Text>
				</EmailCard>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Adresse de livraison
				</EmailHeading>
				<EmailCard>
					<Text
						className={EMAIL_CLASSES.text.body}
						style={{
							margin: 0,
							fontSize: "14px",
							color: EMAIL_COLORS.text.primary,
						}}
					>
						{shippingAddress.firstName} {shippingAddress.lastName}
					</Text>
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{shippingAddress.address1}
					</Text>
					{shippingAddress.address2 && (
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							{shippingAddress.address2}
						</Text>
					)}
					<Text
						className={EMAIL_CLASSES.text.secondary}
						style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
					>
						{shippingAddress.postalCode} {shippingAddress.city}
					</Text>
					<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
						{shippingAddress.country}
					</Text>
				</EmailCard>
			</Section>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "12px" }}>
					Articles
				</EmailHeading>

				{items.map((item, index) => (
					<FlexRow
						key={index}
						style={{
							marginBottom: "12px",
							paddingBottom: "12px",
							borderBottom: index < items.length - 1 ? `1px solid ${EMAIL_COLORS.border}` : "none",
						}}
						left={
							<>
								<Text
									className={EMAIL_CLASSES.text.body}
									style={{
										margin: 0,
										fontSize: "14px",
										fontWeight: "600",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{item.productTitle}
								</Text>
								{item.skuSize && (
									<Text
										className={EMAIL_CLASSES.text.secondary}
										style={{ ...EMAIL_STYLES.text.small, marginTop: "4px" }}
									>
										Taille: {item.skuSize}
									</Text>
								)}
								{item.skuColor && (
									<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
										Couleur: {item.skuColor}
									</Text>
								)}
								{item.skuMaterial && (
									<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
										Matière: {item.skuMaterial}
									</Text>
								)}
								<Text
									style={{
										margin: 0,
										marginTop: "4px",
										fontSize: "14px",
										fontWeight: "600",
										color: EMAIL_COLORS.primary,
									}}
								>
									Qté: {item.quantity}
								</Text>
							</>
						}
						right={
							<Text
								className={EMAIL_CLASSES.text.body}
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{formatEuro(item.price * item.quantity)}
							</Text>
						}
					/>
				))}

				<Hr style={{ borderColor: EMAIL_COLORS.border, margin: "16px 0" }} />

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
					style={{ marginBottom: "16px" }}
					label="Frais de port"
					value={formatEuro(shipping)}
					variant="mono"
				/>

				<Hr style={{ borderColor: EMAIL_COLORS.border, margin: "12px 0" }} />

				<FlexRow
					left={
						<Text
							className={EMAIL_CLASSES.text.body}
							style={{
								margin: 0,
								fontSize: "16px",
								fontWeight: "bold",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							Total
						</Text>
					}
					right={
						<Text
							style={{
								margin: 0,
								fontFamily: "monospace",
								fontSize: "16px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							{formatEuro(total)}
						</Text>
					}
				/>
			</Section>

			<EmailCTA href={dashboardUrl}>Voir dans le Dashboard</EmailCTA>
		</EmailLayout>
	);
};

AdminNewOrderEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
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
} as AdminNewOrderEmailProps;

export default AdminNewOrderEmail;
