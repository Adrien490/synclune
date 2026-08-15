import { Link, Section, Text } from "react-email";
import { formatEuro } from "@/shared/utils/format-euro";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";

interface RetractationRefundedEmailProps {
	orderNumber: string;
	customerName: string;
	amountRefundedCents: number;
	creditNoteNumber: number;
	/** Lien vers l'avoir HTML (tokenisé). */
	creditNoteUrl?: string | null;
}

export const RetractationRefundedEmail = ({
	orderNumber,
	customerName,
	amountRefundedCents,
	creditNoteNumber,
	creditNoteUrl,
}: RetractationRefundedEmailProps) => {
	return (
		<EmailLayout preview={`Remboursement de la commande ${orderNumber}`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Remboursement effectué</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre commande {orderNumber} a été remboursée sur votre moyen de
					paiement d&apos;origine. Le montant apparaît sous 5 à 10 jours ouvrés selon votre banque.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Montant remboursé"
					value={formatEuro(amountRefundedCents)}
					variant="mono"
				/>
				<EmailSummaryRow label="Avoir" value={`n° ${creditNoteNumber}`} variant="mono" />
			</EmailCard>

			{creditNoteUrl && <EmailCTA href={creditNoteUrl}>Voir mon avoir</EmailCTA>}

			<Section style={{ marginTop: "12px" }}>
				<Text className={EMAIL_CLASSES.text.secondary} style={EMAIL_STYLES.text.small}>
					Merci d&apos;avoir donné sa chance à une création Synclune — au plaisir de vous retrouver.{" "}
					<Link
						href="https://synclune.fr"
						style={{ color: EMAIL_COLORS.text.secondary, textDecoration: "underline" }}
					>
						synclune.fr
					</Link>
				</Text>
			</Section>
		</EmailLayout>
	);
};

RetractationRefundedEmail.PreviewProps = {
	orderNumber: "n° 12",
	customerName: "Marie",
	amountRefundedCents: 4299,
	creditNoteNumber: 1,
	creditNoteUrl:
		"https://synclune.fr/suivi-commande/avoir?commande=k3x9m2p8q1r5s7t0&token=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
} as RetractationRefundedEmailProps;

export default RetractationRefundedEmail;
