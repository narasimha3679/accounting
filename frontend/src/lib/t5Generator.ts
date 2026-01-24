import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type Dividend, type DividendRecipient, type Company } from './api';
import { formatLocalDate } from './utils';

/**
 * CRA T5 Slip Generator
 * 
 * Generates T5 slips (Statement of Investment Income) in compliance with CRA requirements.
 * T5 slips are required when paying dividends or investment income to Canadian residents.
 */

// CRA tax rates and gross-up factors (2024 rates)
const NON_ELIGIBLE_GROSS_UP = 1.15; // 15% gross-up
const ELIGIBLE_GROSS_UP = 1.38; // 38% gross-up
const NON_ELIGIBLE_TAX_CREDIT_RATE = 0.10; // 10% of grossed-up amount
const ELIGIBLE_TAX_CREDIT_RATE = 0.15; // 15% of grossed-up amount

// interface T5SlipData {
//     dividend: Dividend;
//     recipient: DividendRecipient;
//     company: Company;
//     calendarYear: number;
// }

/**
 * Calculate T5 slip box values for a dividend recipient
 */
function calculateT5Boxes(
    dividendAmount: number,
    dividendType: 'eligible' | 'non_eligible'
): {
    actualAmount: number;
    grossedUpAmount: number;
    taxCredit: number;
} {
    const actualAmount = dividendAmount;
    
    let grossedUpAmount: number;
    let taxCredit: number;
    
    if (dividendType === 'eligible') {
        grossedUpAmount = actualAmount * ELIGIBLE_GROSS_UP;
        taxCredit = grossedUpAmount * ELIGIBLE_TAX_CREDIT_RATE;
    } else {
        grossedUpAmount = actualAmount * NON_ELIGIBLE_GROSS_UP;
        taxCredit = grossedUpAmount * NON_ELIGIBLE_TAX_CREDIT_RATE;
    }
    
    return {
        actualAmount: Math.round(actualAmount * 100) / 100,
        grossedUpAmount: Math.round(grossedUpAmount * 100) / 100,
        taxCredit: Math.round(taxCredit * 100) / 100,
    };
}

/**
 * Format SIN for display (XXX XXX XXX)
 */
function formatSIN(sin: string | null | undefined): string {
    if (!sin) return '';
    const cleaned = sin.replace(/\D/g, '');
    if (cleaned.length !== 9) return sin;
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`;
}

/**
 * Generate a single T5 slip PDF
 */
export async function generateT5SlipPDF(
    dividend: Dividend,
    recipient: DividendRecipient,
    company: Company
): Promise<Blob> {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;

    // Get calendar year from payment date or declaration date
    const paymentDate = dividend.payment_date ? new Date(dividend.payment_date) : new Date(dividend.declaration_date);
    const calendarYear = paymentDate.getFullYear();

    // Calculate T5 box values
    const boxes = calculateT5Boxes(recipient.amount, dividend.dividend_type);

    // Header - CRA T5 Slip
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('T5 - Statement of Investment Income', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    // Year
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Tax Year: ${calendarYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Payer Information Section
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYER INFORMATION', margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${company.name}`, margin, yPos);
    yPos += 5;
    
    if (company.business_number) {
        pdf.text(`Business Number: ${company.business_number}`, margin, yPos);
        yPos += 5;
    }

    // Recipient Information Section
    yPos += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.text('RECIPIENT INFORMATION', margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${recipient.recipient_name}`, margin, yPos);
    yPos += 5;

    if (recipient.recipient_sin) {
        pdf.text(`SIN: ${formatSIN(recipient.recipient_sin)}`, margin, yPos);
        yPos += 5;
    } else {
        pdf.setTextColor(255, 0, 0);
        pdf.text('SIN: MISSING - REQUIRED FOR FILING', margin, yPos);
        pdf.setTextColor(0, 0, 0);
        yPos += 5;
    }

    if (recipient.recipient_type === 'corporation' && recipient.business_number) {
        pdf.text(`Business Number: ${recipient.business_number}`, margin, yPos);
        yPos += 5;
    }

    if (recipient.mailing_address) {
        const addressLines = recipient.mailing_address.split('\n');
        addressLines.forEach((line) => {
            pdf.text(`Address: ${line}`, margin, yPos);
            yPos += 5;
        });
    }

    // T5 Boxes Section
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('INCOME INFORMATION', margin, yPos);
    yPos += 8;

    // Create table for T5 boxes
    const tableData: string[][] = [];
    
    if (dividend.dividend_type === 'non_eligible') {
        tableData.push(['Box 10', 'Non-eligible dividends', `$${boxes.actualAmount.toFixed(2)}`]);
        tableData.push(['Box 11', 'Grossed-up amount (15%)', `$${boxes.grossedUpAmount.toFixed(2)}`]);
        tableData.push(['Box 12', 'Dividend tax credit', `$${boxes.taxCredit.toFixed(2)}`]);
    } else {
        tableData.push(['Box 24', 'Eligible dividends', `$${boxes.actualAmount.toFixed(2)}`]);
        tableData.push(['Box 25', 'Grossed-up amount (38%)', `$${boxes.grossedUpAmount.toFixed(2)}`]);
        tableData.push(['Box 26', 'Dividend tax credit', `$${boxes.taxCredit.toFixed(2)}`]);
    }

    autoTable(pdf, {
        startY: yPos,
        head: [['Box', 'Description', 'Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
    });

    // Footer
    const finalY = (pdf as any).lastAutoTable.finalY || yPos + 30;
    yPos = finalY + 10;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text(
        'This is a computer-generated T5 slip. Keep this document for your tax records.',
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
    );

    pdf.text(
        `Generated: ${formatLocalDate(new Date().toISOString().split('T')[0])}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );

    // Convert to blob
    const pdfBlob = pdf.output('blob');
    return pdfBlob;
}

/**
 * Generate T5 Summary PDF for a fiscal year
 */
export async function generateT5SummaryPDF(
    company: Company,
    fiscalYear: number,
    dividends: Dividend[],
    recipients: DividendRecipient[]
): Promise<Blob> {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('T5 Summary - Return of Investment Income', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fiscal Year: ${fiscalYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Company Information
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYER INFORMATION', margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Company Name: ${company.name}`, margin, yPos);
    yPos += 5;

    if (company.business_number) {
        const programAccountNumber = `${company.business_number}RZ`;
        pdf.text(`Program Account Number: ${programAccountNumber}`, margin, yPos);
        yPos += 5;
    }

    // Aggregate T5 data
    const eligibleDividends: DividendRecipient[] = [];
    const nonEligibleDividends: DividendRecipient[] = [];

    dividends.forEach((dividend) => {
        const dividendRecipients = recipients.filter(r => r.dividend_id === dividend.id);
        dividendRecipients.forEach((recipient) => {
            if (dividend.dividend_type === 'eligible') {
                eligibleDividends.push(recipient);
            } else {
                nonEligibleDividends.push(recipient);
            }
        });
    });

    // Calculate totals
    const eligibleTotal = eligibleDividends.reduce((sum, r) => sum + r.amount, 0);
    const nonEligibleTotal = nonEligibleDividends.reduce((sum, r) => sum + r.amount, 0);

    const eligibleBoxes = calculateT5Boxes(eligibleTotal, 'eligible');
    const nonEligibleBoxes = calculateT5Boxes(nonEligibleTotal, 'non_eligible');

    const totalSlips = recipients.length;

    // Summary Table
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('SUMMARY OF T5 SLIPS', margin, yPos);
    yPos += 8;

    const summaryData: string[][] = [
        ['Total number of T5 slips', totalSlips.toString()],
        ['', ''],
        ['Non-Eligible Dividends:', ''],
        ['  Box 10 - Actual amount', `$${nonEligibleBoxes.actualAmount.toFixed(2)}`],
        ['  Box 11 - Grossed-up amount', `$${nonEligibleBoxes.grossedUpAmount.toFixed(2)}`],
        ['  Box 12 - Tax credit', `$${nonEligibleBoxes.taxCredit.toFixed(2)}`],
        ['', ''],
        ['Eligible Dividends:', ''],
        ['  Box 24 - Actual amount', `$${eligibleBoxes.actualAmount.toFixed(2)}`],
        ['  Box 25 - Grossed-up amount', `$${eligibleBoxes.grossedUpAmount.toFixed(2)}`],
        ['  Box 26 - Tax credit', `$${eligibleBoxes.taxCredit.toFixed(2)}`],
    ];

    autoTable(pdf, {
        startY: yPos,
        head: [['Description', 'Amount']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
    });

    // Signature section
    const finalY = (pdf as any).lastAutoTable.finalY || yPos + 50;
    yPos = finalY + 15;

    pdf.setFont('helvetica', 'bold');
    pdf.text('AUTHORIZED SIGNATURE', margin, yPos);
    yPos += 15;

    pdf.setFont('helvetica', 'normal');
    pdf.text('Signature: _________________________', margin, yPos);
    yPos += 8;
    pdf.text('Name: _________________________', margin, yPos);
    yPos += 8;
    pdf.text('Title: _________________________', margin, yPos);
    yPos += 8;
    pdf.text('Date: _________________________', margin, yPos);

    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text(
        'This T5 Summary must be filed with CRA by the last day of February following the tax year.',
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
    );

    pdf.text(
        `Generated: ${formatLocalDate(new Date().toISOString().split('T')[0])}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );

    const pdfBlob = pdf.output('blob');
    return pdfBlob;
}
