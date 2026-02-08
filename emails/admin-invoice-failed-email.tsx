import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

interface AdminInvoiceFailedEmailProps {
	orderNumber: string;
	customerEmail: string;
	customerCompanyName?: string;
	customerSiret?: string;
	amount: number;
	errorMessage: string;
	stripePaymentIntentId?: string;
	dashboardUrl: string;
}

export const AdminInvoiceFailedEmail = ({
	orderNumber,
	customerEmail,
	customerCompanyName,
	customerSiret,
	amount,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
}: AdminInvoiceFailedEmailProps) => {
	return (
		<EmailLayout
			preview={`ACTION REQUISE : Echec generation facture - ${orderNumber}`}
			headerText="Echec generation facture"
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text style={EMAIL_STYLES.text.small}>
					Conformite legale - Action requise
				</Text>
			</Section>

			{/* Details */}
			<Section style={{ marginBottom: "24px" }}>
				<div style={EMAIL_STYLES.section.card}>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Commande</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{orderNumber}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Montant</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.primary,
								}}
							>
								{formatEuro(amount)}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Client</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{customerEmail}
							</Text>
						}
					/>
					{customerCompanyName && (
						<FlexRow
							style={{ marginBottom: "8px" }}
							left={<Text style={EMAIL_STYLES.text.small}>Entreprise</Text>}
							right={
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{customerCompanyName}
								</Text>
							}
						/>
					)}
					{customerSiret && (
						<FlexRow
							left={<Text style={EMAIL_STYLES.text.small}>SIRET</Text>}
							right={
								<Text
									style={{
										margin: 0,
										fontFamily: "monospace",
										fontSize: "14px",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{customerSiret}
								</Text>
							}
						/>
					)}
				</div>
			</Section>

			{/* Error */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Erreur
				</Text>
				<div
					style={{
						...EMAIL_STYLES.section.card,
						backgroundColor: EMAIL_COLORS.text.primary,
						padding: "12px",
					}}
				>
					<code
						style={{
							fontFamily: "monospace",
							fontSize: "12px",
							color: EMAIL_COLORS.primary,
							wordBreak: "break-all",
						}}
					>
						{errorMessage}
					</code>
				</div>
			</Section>

			{/* Stripe ID */}
			{stripePaymentIntentId && (
				<Section style={{ marginBottom: "24px" }}>
					<Text
						style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}
					>
						Identifiant Stripe
					</Text>
					<div style={EMAIL_STYLES.section.card}>
						<Text style={EMAIL_STYLES.text.tiny}>Payment Intent ID</Text>
						<Text
							style={{
								margin: 0,
								marginTop: "4px",
								fontFamily: "monospace",
								fontSize: "12px",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{stripePaymentIntentId}
						</Text>
					</div>
				</Section>
			)}

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={dashboardUrl} style={EMAIL_STYLES.button.primary}>
					Voir la commande
				</Button>
			</Section>
		</EmailLayout>
	);
};

AdminInvoiceFailedEmail.PreviewProps = {
	orderNumber: "CMD-1730000000-ABCD",
	customerEmail: "marie.dupont@example.com",
	customerCompanyName: "Dupont SARL",
	customerSiret: "12345678901234",
	amount: 18390,
	errorMessage: "Error: Failed to generate PDF invoice - template rendering timeout",
	stripePaymentIntentId: "pi_1234567890abcdefghij",
	dashboardUrl: "https://synclune.fr/admin/ventes/commandes/clxxx12345",
} as AdminInvoiceFailedEmailProps;

export default AdminInvoiceFailedEmail;
