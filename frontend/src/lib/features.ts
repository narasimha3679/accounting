const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export type BackendFeatures = {
    ocr: boolean;
    bank_statements: boolean;
    push_notifications: boolean;
    storage: boolean;
};

const defaultFeatures: BackendFeatures = {
    ocr: false,
    bank_statements: false,
    push_notifications: false,
    storage: false,
};

let cached: BackendFeatures | null = null;

export function resetBackendFeaturesCacheForTest() {
    cached = null;
}

export async function getBackendFeatures(): Promise<BackendFeatures> {
    if (cached) return cached;
    try {
        const res = await fetch(`${API_BASE.replace(/\/$/, '')}/v1/features`);
        if (!res.ok) {
            return defaultFeatures;
        }
        const data = (await res.json()) as Partial<BackendFeatures>;
        cached = {
            ocr: data.ocr === true,
            bank_statements: data.bank_statements === true,
            push_notifications: data.push_notifications === true,
            storage: data.storage === true,
        };
        return cached;
    } catch {
        return defaultFeatures;
    }
}
