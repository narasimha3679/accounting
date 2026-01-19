/**
 * Bulk Pay Stub Generator
 * 
 * Generates PDFs for all employees in a pay run and creates a zip file
 */

import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { PayStubDocument } from './payStubGenerator';
import type { PayRun, PayRunItem, Employee, Company, PayRunItemDeduction } from './api';
import type { EmployeeYTD } from './payrollTypes';
import api from './api';

interface PayStubData {
    payRun: PayRun;
    item: PayRunItem;
    employee: Employee;
    company: Company;
    ytd: EmployeeYTD;
    deductions: PayRunItemDeduction[];
}

/**
 * Generate PDF buffer for a single pay stub
 */
async function generatePayStubPDF(data: PayStubData): Promise<ArrayBuffer> {
    const doc = (
        <PayStubDocument
            payRun={data.payRun}
            item={data.item}
            employee={data.employee}
            company={data.company}
            ytd={data.ytd}
            deductions={data.deductions}
        />
    );

    const instance = pdf(doc);
    const blob = await instance.toBlob();
    return await blob.arrayBuffer();
}

/**
 * Generate all pay stubs for a pay run and create a zip file
 */
export async function generateAllPayStubs(payRunId: number): Promise<Blob> {
    // Get pay run with items
    const payRun = await api.getPayRun(payRunId);
    if (!payRun.items || payRun.items.length === 0) {
        throw new Error('No employees in this pay run');
    }

    // Get company
    const company = await api.getCompany(payRun.company_id);

    // Get tax year
    const taxYear = new Date(payRun.pay_period_start).getFullYear();

    // Generate PDFs for all items
    const pdfs: { name: string; buffer: ArrayBuffer }[] = [];
    const errors: string[] = [];

    for (const item of payRun.items) {
        try {
            if (!item.employee) {
                errors.push(`Employee data missing for item ${item.id}`);
                continue;
            }

            // Get YTD data
            const ytd = await api.getEmployeeYTD(item.employee_id, taxYear);

            // Get deductions
            const deductions = await api.getPayRunItemDeductions(item.id);

            // Generate PDF
            const buffer = await generatePayStubPDF({
                payRun,
                item,
                employee: item.employee,
                company,
                ytd,
                deductions,
            });

            const fileName = `paystub_${item.employee.employee_id}_${payRun.pay_date.replace(/-/g, '')}.pdf`;
            pdfs.push({ name: fileName, buffer });
        } catch (error: any) {
            errors.push(`Failed to generate pay stub for employee ${item.employee?.employee_id || item.id}: ${error.message}`);
        }
    }

    if (pdfs.length === 0) {
        throw new Error(`Failed to generate any pay stubs. Errors: ${errors.join('; ')}`);
    }

    // Create zip file
    const zip = new JSZip();
    for (const { name, buffer } of pdfs) {
        zip.file(name, buffer);
    }

    // Generate zip blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return zipBlob;
}

/**
 * Download zip file
 */
export function downloadZip(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
