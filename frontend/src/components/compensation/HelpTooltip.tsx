import React from 'react';
import HelpIcon from '../ui/HelpIcon';

interface HelpTooltipProps {
    topic: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

const helpContent: Record<string, { title: string; content: string }> = {
    corporateNetIncome: {
        title: 'Corporate Net Income',
        content:
            "Your company's profit after expenses and salaries. We calculate this automatically from your invoices, income entries, expenses, and salaries for the current fiscal year. This is the amount available for compensation.",
    },
    rdtohBalance: {
        title: 'RDTOH Balance',
        content:
            'Refundable Dividend Tax On Hand - a tax credit you can get back when paying non-eligible dividends. This balance is automatically tracked based on your corporate tax payments and dividend history. When you pay non-eligible dividends, you get a refund of $1 for every $2.61 paid, up to your RDTOH balance.',
    },
    rrspRoom: {
        title: 'RRSP Contribution Room',
        content:
            'Contribution space created when you take salary. You can use this room to save for retirement in an RRSP, which provides tax-deferred growth.',
    },
    cppContributions: {
        title: 'CPP Contributions',
        content:
            'Canada Pension Plan contributions built when you take salary. These contributions increase your CPP pension benefits in retirement.',
    },
    eligibleDividends: {
        title: 'Eligible Dividends',
        content:
            'Dividends from public corporations that receive favorable tax treatment through the dividend tax credit system.',
    },
    nonEligibleDividends: {
        title: 'Non-Eligible Dividends',
        content:
            'Dividends from private corporations (like yours) that can trigger RDTOH refunds, reducing your overall tax burden.',
    },
    otherPersonalIncome: {
        title: 'Other Personal Income',
        content:
            'Any income you receive outside of this company (e.g., from other jobs, investments, rental income). This affects your tax bracket.',
    },
    province: {
        title: 'Province',
        content:
            'Your province of residence affects tax rates and dividend tax credits. Different provinces have different tax brackets and rates.',
    },
    effectiveTaxRate: {
        title: 'Effective Tax Rate',
        content:
            'The average tax rate you pay on your corporate income, including both corporate and personal taxes, after accounting for credits and refunds.',
    },
    totalTaxBurden: {
        title: 'Total Tax Burden',
        content:
            'The combined amount of corporate tax and personal tax you pay, minus any RDTOH refunds. Lower is better!',
    },
    netCashToOwner: {
        title: 'Net Cash to Owner',
        content:
            'The actual amount you keep after all taxes, CPP, and EI deductions. This is what goes into your personal bank account.',
    },
};

const HelpTooltip: React.FC<HelpTooltipProps> = ({ topic, position = 'top', className }) => {
    const help = helpContent[topic];

    if (!help) {
        console.warn(`No help content found for topic: ${topic}`);
        return null;
    }

    return (
        <HelpIcon
            content={help.content}
            title={help.title}
            position={position}
            className={className}
            size="sm"
        />
    );
};

export default HelpTooltip;
