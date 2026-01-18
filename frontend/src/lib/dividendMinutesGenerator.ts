import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Dividend, type DividendRecipient, type Company } from './api';

/**
 * Dividend Declaration Minutes Generator
 * 
 * Generates corporate minutes documenting dividend declarations for corporate record-keeping.
 */

/**
 * Generate dividend declaration minutes PDF
 */
export function generateDividendMinutesPDF(
    dividend: Dividend,
    recipients: DividendRecipient[],
    company: Company
): Blob {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CORPORATE MINUTES', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(company.name, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Meeting Information
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MEETING OF THE BOARD OF DIRECTORS', margin, yPos);
    yPos += 8;

    const declarationDate = new Date(dividend.declaration_date);
    const paymentDate = dividend.payment_date ? new Date(dividend.payment_date) : null;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date: ${declarationDate.toLocaleDateString('en-CA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}`, margin, yPos);
    yPos += 6;

    // Present section
    pdf.text('Present:', margin, yPos);
    yPos += 6;
    pdf.text('_________________________', margin + 10, yPos);
    yPos += 6;
    pdf.text('_________________________', margin + 10, yPos);
    yPos += 10;

    // Resolution
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESOLUTION', margin, yPos);
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    const resolutionText = [
        `WHEREAS, the Corporation has accumulated earnings and profits available for distribution;`,
        ``,
        `NOW, THEREFORE, BE IT RESOLVED, that the Board of Directors hereby declares a ${dividend.dividend_type === 'eligible' ? 'eligible' : 'non-eligible'} dividend`,
        `in the total amount of $${dividend.amount.toFixed(2)} CAD,`,
        `to be paid on ${paymentDate ? paymentDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'a date to be determined'}`,
        `to the shareholders of record as of ${declarationDate.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
        ``,
        `BE IT FURTHER RESOLVED, that the dividend shall be distributed to the following recipients:`,
    ];

    resolutionText.forEach((line) => {
        const lines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        lines.forEach((textLine: string) => {
            pdf.text(textLine, margin, yPos);
            yPos += 5;
        });
    });

    // Recipients table
    yPos += 5;
    const recipientsData = recipients.map((recipient, index) => [
        (index + 1).toString(),
        recipient.recipient_name,
        recipient.recipient_type,
        `$${recipient.amount.toFixed(2)}`,
    ]);

    autoTable(pdf, {
        startY: yPos,
        head: [['#', 'Recipient Name', 'Type', 'Amount']],
        body: recipientsData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
    });

    // Additional resolution text
    const finalY = (pdf as any).lastAutoTable.finalY || yPos + 30;
    yPos = finalY + 10;

    const additionalText = [
        ``,
        `BE IT FURTHER RESOLVED, that the Corporation's officers are hereby authorized and directed`,
        `to take all actions necessary to effectuate this dividend declaration and payment.`,
        ``,
        `The foregoing resolution was duly adopted by the Board of Directors.`,
    ];

    additionalText.forEach((line) => {
        const lines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        lines.forEach((textLine: string) => {
            pdf.text(textLine, margin, yPos);
            yPos += 5;
        });
    });

    // Signature section
    yPos += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('CERTIFICATION', margin, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.text('I certify that the above is a true and correct copy of the minutes', margin, yPos);
    yPos += 6;
    pdf.text('of the meeting of the Board of Directors.', margin, yPos);
    yPos += 15;

    pdf.text('Secretary: _________________________', margin, yPos);
    yPos += 8;
    pdf.text('Date: _________________________', margin, yPos);
    yPos += 15;

    pdf.text('President/CEO: _________________________', margin, yPos);
    yPos += 8;
    pdf.text('Date: _________________________', margin, yPos);

    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text(
        `Business Number: ${company.business_number || 'N/A'}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
    );

    pdf.text(
        `Generated: ${new Date().toLocaleDateString('en-CA')}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );

    const pdfBlob = pdf.output('blob');
    return pdfBlob;
}
