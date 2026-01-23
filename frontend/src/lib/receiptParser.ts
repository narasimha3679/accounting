import { createWorker } from 'tesseract.js';

export interface ExtractedReceiptData {
    date?: string;
    amount?: number;
    hst?: number;
    merchant?: string;
    category?: string;
    description?: string;
    text: string;
}

export const parseReceiptText = (text: string): ExtractedReceiptData => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. Merchant: Simple heuristic - first non-short line that usually isn't a header
    // Skip lines that are just "Receipt" or "Tax Invoice"
    let merchant = lines[0];
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        if (line.length > 3 && !line.match(/receipt|invoice|copy|original|customer|merchant|transaction/i)) {
            merchant = line;
            break;
        }
    }

    // 2. Amount: Look for "Total"
    // Regex for money: $? 123.45 or 1,234.45
    // Captures: $123.45, 123.45, 1,234.45
    const moneyRegex = /(\$?\s?\d{1,3}(?:[,]\d{3})*(?:[.]\d{2}))/i;

    let totalAmount: number | undefined;
    let hstAmount: number | undefined;

    // Search from bottom up for Total
    // This is better because the grand total is usually at the bottom
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].toLowerCase();
        // Check for Total line
        if (line.match(/\b(total|amount due|balance|pay)\b/) && !line.match(/\b(subtotal|net)\b/)) {
            const match = line.match(moneyRegex);
            if (match) {
                const numStr = match[1].replace(/[^0-9.]/g, '');
                const num = parseFloat(numStr);
                if (!isNaN(num)) {
                    totalAmount = num;
                    break; // Found the total
                }
            }
        }
    }

    // Fallback: If no "Total" keyword found, look for largest number in the bottom half of the receipt?
    // Risk of picking up credit card number or ID. Let's stick to keyword for safety for now.
    // Or, if we haven't found a total, let's look for the largest monetary value in the text.
    if (!totalAmount) {
        let maxVal = 0;
        for (const line of lines) {
            const match = line.match(moneyRegex);
            if (match) {
                const numStr = match[1].replace(/[^0-9.]/g, '');
                const num = parseFloat(numStr);
                if (!isNaN(num) && num > maxVal && num < 100000) { // Safety cap
                    maxVal = num;
                }
            }
        }
        if (maxVal > 0) totalAmount = maxVal;
    }

    // 3. Tax (HST/GST)
    // Search for HST/GST keywords
    for (const line of lines) {
        const l = line.toLowerCase();
        // Look for tax but avoid "Tax included" text if it doesn't have a number
        if (l.match(/\b(hst|gst|tax)\b/)) {
            const match = line.match(moneyRegex);
            if (match) {
                const numStr = match[1].replace(/[^0-9.]/g, '');
                const num = parseFloat(numStr);
                if (!isNaN(num)) {
                    // If we find multiple tax lines (e.g. GST and PST), we might want to sum them?
                    // For now, let's assume the largest tax-like number is the total tax, 
                    // or accumulating them if they are on separate lines could be better.
                    // Let's simple sum any line with HST/GST in it? No, could list tax rate.
                    // Just taking the largest found tax-line for now.
                    if (!hstAmount || num > hstAmount) {
                        hstAmount = num;
                    }
                }
            }
        }
    }

    // 4. Date
    // Try to find a date
    let dateStr: string | undefined;
    // YYYY-MM-DD
    const isoDate = text.match(/\b20\d{2}[-./](0[1-9]|1[0-2])[-./](0[1-9]|[12]\d|3[01])\b/);
    if (isoDate) dateStr = isoDate[0];

    if (!dateStr) {
        // MM/DD/YYYY or DD/MM/YYYY
        // Looking for something that looks like a date
        const commonDate = text.match(/\b(0?[1-9]|1[0-2])[-./](0?[1-9]|[12]\d|3[01])[-./](20\d{2}|\d{2})\b/);
        if (commonDate) dateStr = commonDate[0];
    }

    if (!dateStr) {
        // Text date: Jan 01, 2024
        const textDate = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2}\b/i);
        if (textDate) dateStr = textDate[0];
    }

    // Normalize date
    if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            dateStr = d.toISOString().split('T')[0];
        } else {
            dateStr = undefined; // Failed to parse
        }
    }

    return {
        merchant: merchant?.substring(0, 50), // Limit length
        amount: totalAmount,
        hst: hstAmount,
        date: dateStr,
        text
    };
};

export const scanReceipt = async (imageFile: File, onProgress?: (progress: number) => void): Promise<ExtractedReceiptData> => {
    // Create worker with logging
    const worker = await createWorker('eng', 1, {
        logger: m => {
            if (m.status === 'recognizing text' && onProgress) {
                onProgress(m.progress);
            }
        }
    });

    const ret = await worker.recognize(imageFile);
    await worker.terminate();

    return parseReceiptText(ret.data.text);
};
