import JSZip from 'jszip';
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

const NON_ELIGIBLE_GROSS_UP = 1.15;
const ELIGIBLE_GROSS_UP = 1.38;
const NON_ELIGIBLE_TAX_CREDIT_RATE = 0.10;
const ELIGIBLE_TAX_CREDIT_RATE = 0.15;

export interface AnnualT5RecipientGroup {
    key: string;
    profileId: number | null;
    recipientName: string;
    recipientSin: string | null;
    recipientType: 'individual' | 'corporation' | 'trust';
    businessNumber: string | null;
    mailingAddress: string | null;
    eligibleAmount: number;
    nonEligibleAmount: number;
}

export interface AnnualT5GenerationResult {
    zipBlob: Blob;
    slipCount: number;
    missingRecipientDividendCount: number;
    missingRecipientTotalAmount: number;
    groups: AnnualT5RecipientGroup[];
}

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

function formatSIN(sin: string | null | undefined): string {
    if (!sin) return '';
    const cleaned = sin.replace(/\D/g, '');
    if (cleaned.length !== 9) return sin;
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`;
}

function normalizeName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Group by CRA identity: SIN for individuals, BN for corporations, then profile, then name.
 * Preferring SIN over profile_id merges legacy rows with profile-linked rows for the same person.
 */
function recipientGroupKey(recipient: DividendRecipient): string {
    const sin = recipient.recipient_sin?.replace(/\D/g, '');
    if (sin && sin.length === 9) {
        return `sin:${sin}`;
    }
    const bn = recipient.business_number?.replace(/\s+/g, '').toUpperCase();
    if (bn) {
        return `bn:${bn}`;
    }
    if (recipient.profile_id != null) {
        return `profile:${recipient.profile_id}`;
    }
    return `name:${normalizeName(recipient.recipient_name)}`;
}

/** Calendar year from payment_date (else declaration_date), timezone-safe for YYYY-MM-DD. */
export function getDividendCalendarYear(dividend: Dividend): number {
    const dateStr = dividend.payment_date || dividend.declaration_date;
    const dateOnly = dateStr.split('T')[0];
    const year = Number(dateOnly.split('-')[0]);
    if (!Number.isFinite(year)) {
        throw new Error(`Invalid dividend date for calendar year: ${dateStr}`);
    }
    return year;
}

/**
 * Group allocation rows for a calendar year into one slip per recipient identity
 * (SIN → business number → profile_id → normalized name).
 */
export function groupRecipientsForCalendarYear(
    dividends: Dividend[],
    recipients: DividendRecipient[]
): AnnualT5RecipientGroup[] {
    const dividendById = new Map(dividends.map((d) => [d.id, d]));
    const groups = new Map<string, AnnualT5RecipientGroup>();

    for (const recipient of recipients) {
        const dividend = dividendById.get(recipient.dividend_id);
        if (!dividend) continue;

        const key = recipientGroupKey(recipient);
        const amount = Number(recipient.amount) || 0;
        const existing = groups.get(key);
        if (!existing) {
            groups.set(key, {
                key,
                profileId: recipient.profile_id ?? null,
                recipientName: recipient.recipient_name,
                recipientSin: recipient.recipient_sin ?? null,
                recipientType: recipient.recipient_type,
                businessNumber: recipient.business_number ?? null,
                mailingAddress: recipient.mailing_address ?? null,
                eligibleAmount: dividend.dividend_type === 'eligible' ? amount : 0,
                nonEligibleAmount: dividend.dividend_type === 'non_eligible' ? amount : 0,
            });
        } else {
            if (dividend.dividend_type === 'eligible') {
                existing.eligibleAmount += amount;
            } else {
                existing.nonEligibleAmount += amount;
            }
            if (!existing.recipientSin && recipient.recipient_sin) {
                existing.recipientSin = recipient.recipient_sin;
            }
            if (!existing.mailingAddress && recipient.mailing_address) {
                existing.mailingAddress = recipient.mailing_address;
            }
            if (!existing.businessNumber && recipient.business_number) {
                existing.businessNumber = recipient.business_number;
            }
            if (existing.profileId == null && recipient.profile_id != null) {
                existing.profileId = recipient.profile_id;
            }
            // Prefer profile-linked name when merging legacy + profile rows
            if (recipient.profile_id != null && recipient.recipient_name) {
                existing.recipientName = recipient.recipient_name;
            }
        }
    }

    return Array.from(groups.values()).map((g) => ({
        ...g,
        eligibleAmount: Math.round(g.eligibleAmount * 100) / 100,
        nonEligibleAmount: Math.round(g.nonEligibleAmount * 100) / 100,
    }));
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function buildT5SlipPdf(
    company: Company,
    calendarYear: number,
    recipientName: string,
    recipientSin: string | null,
    recipientType: 'individual' | 'corporation' | 'trust',
    businessNumber: string | null,
    mailingAddress: string | null,
    eligibleAmount: number,
    nonEligibleAmount: number
): Blob {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = margin;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('T5 - Statement of Investment Income', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Tax Year: ${calendarYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

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

    yPos += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.text('RECIPIENT INFORMATION', margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${recipientName}`, margin, yPos);
    yPos += 5;

    if (recipientSin) {
        pdf.text(`SIN: ${formatSIN(recipientSin)}`, margin, yPos);
        yPos += 5;
    } else if (recipientType === 'individual') {
        pdf.setTextColor(255, 0, 0);
        pdf.text('SIN: MISSING - REQUIRED FOR FILING', margin, yPos);
        pdf.setTextColor(0, 0, 0);
        yPos += 5;
    }

    if (recipientType === 'corporation' && businessNumber) {
        pdf.text(`Business Number: ${businessNumber}`, margin, yPos);
        yPos += 5;
    }

    if (mailingAddress) {
        const addressLines = mailingAddress.split('\n');
        addressLines.forEach((line) => {
            pdf.text(`Address: ${line}`, margin, yPos);
            yPos += 5;
        });
    }

    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.text('INCOME INFORMATION', margin, yPos);
    yPos += 8;

    const tableData: string[][] = [];

    if (nonEligibleAmount > 0) {
        const boxes = calculateT5Boxes(nonEligibleAmount, 'non_eligible');
        tableData.push(['Box 10', 'Non-eligible dividends', `$${boxes.actualAmount.toFixed(2)}`]);
        tableData.push(['Box 11', 'Grossed-up amount (15%)', `$${boxes.grossedUpAmount.toFixed(2)}`]);
        tableData.push(['Box 12', 'Dividend tax credit', `$${boxes.taxCredit.toFixed(2)}`]);
    }

    if (eligibleAmount > 0) {
        const boxes = calculateT5Boxes(eligibleAmount, 'eligible');
        tableData.push(['Box 24', 'Eligible dividends', `$${boxes.actualAmount.toFixed(2)}`]);
        tableData.push(['Box 25', 'Grossed-up amount (38%)', `$${boxes.grossedUpAmount.toFixed(2)}`]);
        tableData.push(['Box 26', 'Dividend tax credit', `$${boxes.taxCredit.toFixed(2)}`]);
    }

    if (tableData.length === 0) {
        tableData.push(['—', 'No dividend income', '$0.00']);
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

    return pdf.output('blob');
}

/**
 * Generate a single T5 slip PDF for one payment allocation (preview only).
 */
export async function generateT5SlipPDF(
    dividend: Dividend,
    recipient: DividendRecipient,
    company: Company
): Promise<Blob> {
    const calendarYear = getDividendCalendarYear(dividend);
    const eligibleAmount = dividend.dividend_type === 'eligible' ? recipient.amount : 0;
    const nonEligibleAmount = dividend.dividend_type === 'non_eligible' ? recipient.amount : 0;

    return buildT5SlipPdf(
        company,
        calendarYear,
        recipient.recipient_name,
        recipient.recipient_sin ?? null,
        recipient.recipient_type,
        recipient.business_number ?? null,
        recipient.mailing_address ?? null,
        eligibleAmount,
        nonEligibleAmount
    );
}

/**
 * Generate T5 Summary PDF for a calendar year (slip count = number of recipient groups).
 */
export async function generateT5SummaryPDF(
    company: Company,
    calendarYear: number,
    groups: AnnualT5RecipientGroup[]
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

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('T5 Summary - Return of Investment Income', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Calendar Year: ${calendarYear}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

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

    const eligibleTotal = groups.reduce((sum, g) => sum + g.eligibleAmount, 0);
    const nonEligibleTotal = groups.reduce((sum, g) => sum + g.nonEligibleAmount, 0);
    const eligibleBoxes = calculateT5Boxes(eligibleTotal, 'eligible');
    const nonEligibleBoxes = calculateT5Boxes(nonEligibleTotal, 'non_eligible');
    const totalSlips = groups.length;

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

    return pdf.output('blob');
}

/**
 * Generate calendar-year T5 slips (one per profile/group) + summary as a zip.
 */
export async function generateAnnualT5Package(
    company: Company,
    calendarYear: number,
    dividends: Dividend[],
    recipients: DividendRecipient[]
): Promise<AnnualT5GenerationResult> {
    const yearDividends = dividends.filter((d) => getDividendCalendarYear(d) === calendarYear);
    const yearDividendIds = new Set(yearDividends.map((d) => d.id));
    const yearRecipients = recipients.filter((r) => yearDividendIds.has(r.dividend_id));

    const dividendsWithRecipients = new Set(yearRecipients.map((r) => r.dividend_id));
    const missingDividends = yearDividends.filter((d) => !dividendsWithRecipients.has(d.id));
    const missingRecipientDividendCount = missingDividends.length;
    const missingRecipientTotalAmount = missingDividends.reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
    );

    const groups = groupRecipientsForCalendarYear(yearDividends, yearRecipients);

    if (groups.length === 0) {
        throw new Error(
            missingRecipientDividendCount > 0
                ? `No recipient allocations found for ${calendarYear}. ${missingRecipientDividendCount} dividend(s) are missing recipients (${missingRecipientTotalAmount.toFixed(2)} CAD). Assign recipients first.`
                : `No dividends with recipients found for calendar year ${calendarYear}.`
        );
    }

    const zip = new JSZip();

    groups.forEach((group, index) => {
        const slipBlob = buildT5SlipPdf(
            company,
            calendarYear,
            group.recipientName,
            group.recipientSin,
            group.recipientType,
            group.businessNumber,
            group.mailingAddress,
            group.eligibleAmount,
            group.nonEligibleAmount
        );
        const safeName = group.recipientName.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'recipient';
        const safeKey = group.key.replace(/[^a-zA-Z0-9]+/g, '_');
        zip.file(`T5_${safeName}_${calendarYear}_${index + 1}_${safeKey}.pdf`, slipBlob);
    });

    const summaryBlob = await generateT5SummaryPDF(company, calendarYear, groups);
    zip.file(`T5_Summary_${calendarYear}.pdf`, summaryBlob);

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return {
        zipBlob,
        slipCount: groups.length,
        missingRecipientDividendCount,
        missingRecipientTotalAmount,
        groups,
    };
}

export function downloadAnnualT5Package(zipBlob: Blob, calendarYear: number): void {
    downloadBlob(zipBlob, `T5_${calendarYear}.zip`);
}

/** @deprecated Prefer generateT5SummaryPDF(company, calendarYear, groups) */
export async function generateFiscalYearT5SummaryPDF(
    company: Company,
    fiscalYear: number,
    dividends: Dividend[],
    recipients: DividendRecipient[]
): Promise<Blob> {
    const groups = groupRecipientsForCalendarYear(dividends, recipients);
    return generateT5SummaryPDF(company, fiscalYear, groups);
}
