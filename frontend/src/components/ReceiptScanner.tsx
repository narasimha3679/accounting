import React, { useState, useRef, useEffect } from 'react';
import { Scan, Loader2, Camera, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { ExtractedReceiptData } from '../lib/receiptParser';
import Button from './ui/Button';
import { cn } from '../lib/utils';
import { getBackendFeatures } from '../lib/features';


interface ReceiptScannerProps {
    onScanComplete: (data: ExtractedReceiptData, file: File) => void;
    className?: string;
    variant?: 'button' | 'dropzone';
    categories?: string[];
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
    onScanComplete,
    className,
    variant = 'button',
    categories = []
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);

    const { session } = useAuth();

    useEffect(() => {
        getBackendFeatures()
            .then((f) => setOcrAvailable(f.ocr))
            .catch(() => setOcrAvailable(false));
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        processFile(file);
    };

    const processFile = async (file: File) => {
        if (ocrAvailable === false) {
            setError('Receipt scanning is not enabled on this backend yet.');
            return;
        }
        setIsScanning(true);
        setProgress(10); // Start progress
        setError(null);

        try {
            const formData = new FormData();
            formData.append('receipt', file);
            if (categories.length > 0) {
                formData.append('categories', JSON.stringify(categories));
            }

            // Use backend server URL from environment variable
            const API_BASE =
                import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
            const BACKEND_URL = `${API_BASE}/api/ocr/analyze`;

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                if (response.status === 501 || response.status === 503) {
                    throw new Error('Receipt scanning is currently disabled on this environment.');
                }
                throw new Error('Server failed to process image');
            }

            setProgress(90);
            const result = await response.json();

            if (result.success && result.data) {
                // Map API response to expected data format
                onScanComplete({
                    merchant: result.data.merchant || '',
                    amount: result.data.total_amount || 0,
                    hst: result.data.tax_amount || 0,
                    date: result.data.date || undefined,
                    category: result.data.category,
                    description: result.data.suggested_description,
                    text: '' // Raw text not needed with AI
                }, file);
                setProgress(100);
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (err) {
            console.error('OCR Error:', err);
            setError('Failed to scan receipt. Please ensure backend is running.');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    if (variant === 'dropzone') {
        // TODO: Implement drag and drop zone if needed
        // For now falling back to button style but larger
        return (
            <div
                onClick={triggerFileSelect}
                className={cn(
                    "border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-800/50 transition-colors",
                    isScanning && "pointer-events-none opacity-80",
                    className
                )}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment" // Hints mobile browsers to use camera
                    onChange={handleFileSelect}
                />

                {isScanning ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-neon-emerald" />
                        <div className="text-sm font-medium text-white">Scanning Receipt... {progress}%</div>
                        <div className="w-full max-w-[200px] bg-slate-700 rounded-full h-2 mt-2">
                            <div
                                className="bg-neon-emerald h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-800 rounded-full">
                            <Camera className="h-6 w-6 text-neon-emerald" />
                        </div>
                        <div>
                            <p className="font-medium text-white">Scan Invoice / Receipt</p>
                            <p className="text-sm text-slate-muted mt-1">Take a photo or upload an image</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={className}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
            />

            <Button
                type="button"
                variant="secondary"
                onClick={triggerFileSelect}
                disabled={isScanning || ocrAvailable === false}
                className="w-full sm:w-auto relative overflow-hidden"
                icon={isScanning ? undefined : Scan}
            >
                {isScanning ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Scanning ({progress}%)</span>
                        <div
                            className="absolute bottom-0 left-0 h-1 bg-neon-emerald/50 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                ) : (
                    ocrAvailable === false ? 'Scan Unavailable' : 'Scan Receipt'
                )}
            </Button>

            {error && (
                <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                </div>
            )}
        </div>
    );
};

export default ReceiptScanner;
