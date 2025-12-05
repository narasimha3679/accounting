import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { type InvestmentTransaction } from '../../lib/api';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

interface BalanceChartProps {
    transactions: InvestmentTransaction[];
    className?: string;
}

const BalanceChart: React.FC<BalanceChartProps> = ({ transactions, className }) => {
    const chartData = useMemo(() => {
        // Sort transactions by date ascending
        const sorted = [...transactions].sort((a, b) => 
            new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        );

        // Create data points for the chart
        return sorted.map((transaction) => ({
            date: new Date(transaction.transaction_date).toLocaleDateString('en-CA', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            }),
            balance: Number(transaction.balance_after),
            dateValue: transaction.transaction_date,
        }));
    }, [transactions]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (chartData.length === 0) {
        return (
            <Card className={cn("p-4 sm:p-6", className)}>
                <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Balance Growth</h2>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>No transaction data available</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className={cn("p-4 sm:p-6", className)}>
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Balance Growth</h2>
            <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                        <XAxis 
                            dataKey="date" 
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '12px' }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '12px' }}
                            tickFormatter={formatCurrency}
                        />
                        <Tooltip 
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                        />
                        <Legend />
                        <Line 
                            type="monotone" 
                            dataKey="balance" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Balance"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default BalanceChart;

