import { formatEuro } from "@/shared/utils/format-euro";
import { Section, Text } from "@react-email/components";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
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
			preview={`Échec génération facture — ${orderNumber}`}
			headerText="Échec génération facture"
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Conformité légale - Action requise
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<FlexRow
					style={{ marginBottom: "8px" }}
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Commande
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Montant
						</Text>
					}
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
					left={
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
							Client
						</Text>
					}
					right={
						<Text
							className={EMAIL_CLASSES.text.body}
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
						left={
							<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
								Entreprise
							</Text>
						}
						right={
							<Text
								className={EMAIL_CLASSES.text.body}
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
						left={
							<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
								SIRET
							</Text>
						}
						right={
							<Text
								className={EMAIL_CLASSES.text.body}
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
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Erreur
				</EmailHeading>
				<ErrorCodeBlock error={errorMessage} />
			</Section>

			{stripePaymentIntentId && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
						Identifiant Stripe
					</EmailHeading>
					<EmailCard>
						<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.tiny}>
							Payment Intent ID
						</Text>
						<Text
							className={EMAIL_CLASSES.text.body}
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
					</EmailCard>
				</Section>
			)}

			<EmailCTA href={dashboardUrl}>Voir la commande</EmailCTA>
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
