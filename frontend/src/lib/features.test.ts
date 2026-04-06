import { describe, expect, it, vi, beforeEach } from 'vitest';

import { getBackendFeatures, resetBackendFeaturesCacheForTest } from './features';

describe('getBackendFeatures', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetBackendFeaturesCacheForTest();
  });

  it('returns parsed feature flags from backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        ocr: true,
        bank_statements: false,
        push_notifications: true,
        storage: true,
      }),
    } as Response);

    const result = await getBackendFeatures();
    expect(result).toEqual({
      ocr: true,
      bank_statements: false,
      push_notifications: true,
      storage: true,
    });
  });

  it('falls back to disabled flags on request failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const result = await getBackendFeatures();
    expect(result).toEqual({
      ocr: false,
      bank_statements: false,
      push_notifications: false,
      storage: false,
    });
  });
});
