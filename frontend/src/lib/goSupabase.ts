/**
 * Supabase-js–shaped client for the Go API (/v1/data/*, /v1/auth/*).
 */

export const TOKEN_KEY = 'ca_access_token';
const REFRESH_KEY = 'ca_refresh_token';

export type AppSession = {
    access_token: string;
    refresh_token: string | null;
    expires_at?: number;
    user: { id: string; email?: string };
};

type AuthListener = (event: string, session: AppSession | null) => void;
const authListeners = new Set<AuthListener>();

type EmbedSpec = {
    alias: string;
    table: string;
    mode: 'one' | 'many';
    sourceKey?: string;
    foreignKey?: string;
};

function splitTopLevelCsv(input: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === '(') depth++;
        if (ch === ')') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) {
            out.push(input.slice(start, i).trim());
            start = i + 1;
        }
    }
    out.push(input.slice(start).trim());
    return out.filter(Boolean);
}

function singularize(name: string): string {
    if (name.endsWith('ies') && name.length > 3) {
        return `${name.slice(0, -3)}y`;
    }
    if (name.endsWith('s') && name.length > 1) {
        return name.slice(0, -1);
    }
    return name;
}

function parseEmbeds(baseTable: string, columns: string): { baseColumns: string; embeds: EmbedSpec[] } {
    if (!columns || columns.trim() === '*') {
        return { baseColumns: '*', embeds: [] };
    }
    const parts = splitTopLevelCsv(columns);
    const plain: string[] = [];
    const embeds: EmbedSpec[] = [];
    const embedRe = /^([a-z_][a-z0-9_]*)\:([a-z_][a-z0-9_]*)\(\*\)$/i;

    for (const part of parts) {
        const m = part.match(embedRe);
        if (!m) {
            plain.push(part);
            continue;
        }
        const alias = m[1];
        const table = m[2];
        const many = alias.endsWith('s');
        if (many) {
            embeds.push({
                alias,
                table,
                mode: 'many',
                foreignKey: `${singularize(baseTable)}_id`,
            });
        } else {
            embeds.push({
                alias,
                table,
                mode: 'one',
                sourceKey: `${alias}_id`,
            });
        }
    }

    const baseColumns = plain.length > 0 ? plain.join(', ') : '*';
    return { baseColumns, embeds };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    try {
        const pad = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(pad)) as Record<string, unknown>;
    } catch {
        return {};
    }
}

function sessionFromTokens(access: string, refresh: string | null): AppSession {
    const p = decodeJwtPayload(access);
    const exp = p.exp;
    return {
        access_token: access,
        refresh_token: refresh,
        expires_at: typeof exp === 'number' ? exp : undefined,
        user: { id: String(p.sub ?? ''), email: p.email as string | undefined },
    };
}

function emitAuthChange(event: string, session: AppSession | null) {
    for (const cb of authListeners) {
        try {
            cb(event, session);
        } catch {
            /* ignore */
        }
    }
}

export function getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string) {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(apiBase: string): Promise<boolean> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;
    try {
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        const j = await res.json().catch(() => ({}));
        if (!j.access_token) return false;
        setTokens(j.access_token, j.refresh_token ?? refreshToken);
        return true;
    } catch {
        return false;
    }
}

async function apiFetch(apiBase: string, path: string, init: RequestInit = {}, allowRetry = true) {
    const token = getAccessToken();
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (!headers['Content-Type'] && init.body && typeof init.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `${apiBase.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, { ...init, headers });
    if (
        res.status !== 401 ||
        !allowRetry ||
        path.startsWith('/v1/auth/login') ||
        path.startsWith('/v1/auth/register') ||
        path.startsWith('/v1/auth/refresh')
    ) {
        return res;
    }
    refreshPromise ??= refreshAccessToken(apiBase).finally(() => {
        refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (!refreshed) {
        clearTokens();
        emitAuthChange('SIGNED_OUT', null);
        return res;
    }
    const retryHeaders: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (!retryHeaders['Content-Type'] && init.body && typeof init.body === 'string') {
        retryHeaders['Content-Type'] = 'application/json';
    }
    const nextAccess = getAccessToken();
    if (nextAccess) retryHeaders['Authorization'] = `Bearer ${nextAccess}`;
    return fetch(url, { ...init, headers: retryHeaders });
}

export type Filter = { column: string; op: string; value?: any; values?: any[] };

export class QueryBuilder implements PromiseLike<{ data: any; error: any; count?: number | null }> {
    table: string;
    apiBase: string;
    columns = '*';
    wantCount = false;
    isHead = false;
    filters: Filter[] = [];
    orders: { column: string; asc: boolean }[] = [];
    expectSingle = false;
    expectMaybeSingle = false;
    ranged = false;
    rangeFrom = 0;
    rangeTo = 49;

    constructor(apiBase: string, table: string) {
        this.apiBase = apiBase;
        this.table = table;
    }

    private async selectRows(
        table: string,
        filters: Filter[],
        order: { column: string; asc: boolean }[] = [],
    ): Promise<{ data: any[]; error: any }> {
        try {
            const res = await apiFetch(this.apiBase, '/v1/data/select', {
                method: 'POST',
                body: JSON.stringify({
                    table,
                    columns: '*',
                    filters,
                    order,
                    limit: 5000,
                    offset: 0,
                    count: false,
                }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { data: [], error: { message: j.detail || j.title || res.statusText } };
            }
            return { data: Array.isArray(j.data) ? j.data : [], error: null };
        } catch (e: any) {
            return { data: [], error: { message: e?.message || 'network error' } };
        }
    }

    private async hydrateEmbeds(rows: any[], embeds: EmbedSpec[]): Promise<{ data: any[]; error: any }> {
        if (!rows.length || !embeds.length) return { data: rows, error: null };

        for (const embed of embeds) {
            if (embed.mode === 'one') {
                const key = embed.sourceKey as string;
                const ids = Array.from(
                    new Set(
                        rows
                            .map((r) => r?.[key])
                            .filter((v) => v !== null && v !== undefined),
                    ),
                );
                if (!ids.length) {
                    for (const row of rows) row[embed.alias] = null;
                    continue;
                }
                const rel = await this.selectRows(embed.table, [{ column: 'id', op: 'in', values: ids }]);
                if (rel.error) return { data: rows, error: rel.error };
                const byID = new Map<any, any>();
                for (const r of rel.data) byID.set(r.id, r);
                for (const row of rows) row[embed.alias] = byID.get(row?.[key]) ?? null;
                continue;
            }

            const fk = embed.foreignKey as string;
            const baseIDs = Array.from(
                new Set(
                    rows
                        .map((r) => r?.id)
                        .filter((v) => v !== null && v !== undefined),
                ),
            );
            if (!baseIDs.length) {
                for (const row of rows) row[embed.alias] = [];
                continue;
            }
            const rel = await this.selectRows(embed.table, [{ column: fk, op: 'in', values: baseIDs }]);
            if (rel.error) return { data: rows, error: rel.error };
            const grouped = new Map<any, any[]>();
            for (const r of rel.data) {
                const id = r?.[fk];
                if (id === null || id === undefined) continue;
                const arr = grouped.get(id) ?? [];
                arr.push(r);
                grouped.set(id, arr);
            }
            for (const row of rows) row[embed.alias] = grouped.get(row?.id) ?? [];
        }
        return { data: rows, error: null };
    }

    select(columns = '*', opts?: { count?: string; head?: boolean }) {
        this.columns = columns;
        this.wantCount = opts?.count === 'exact';
        this.isHead = opts?.head === true;
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, op: 'eq', value });
        return this;
    }
    neq(column: string, value: any) {
        this.filters.push({ column, op: 'neq', value });
        return this;
    }
    gt(column: string, value: any) {
        this.filters.push({ column, op: 'gt', value });
        return this;
    }
    gte(column: string, value: any) {
        this.filters.push({ column, op: 'gte', value });
        return this;
    }
    lt(column: string, value: any) {
        this.filters.push({ column, op: 'lt', value });
        return this;
    }
    lte(column: string, value: any) {
        this.filters.push({ column, op: 'lte', value });
        return this;
    }
    like(column: string, value: any) {
        this.filters.push({ column, op: 'like', value });
        return this;
    }
    ilike(column: string, value: any) {
        this.filters.push({ column, op: 'ilike', value });
        return this;
    }
    is(column: string, value: null) {
        this.filters.push({ column, op: 'is', value });
        return this;
    }
    in(column: string, values: any[]) {
        this.filters.push({ column, op: 'in', values });
        return this;
    }
    or(expr: string) {
        const parts = expr.split(',');
        for (const p of parts) {
            const m = p.match(/^([^.]+)\.(eq|ilike|like|gte|lte|gt|lt)\.(.+)$/);
            if (m) {
                let val: any = m[3];
                if (!Number.isNaN(Number(val)) && !val.startsWith('%')) val = Number(val);
                this.filters.push({ column: m[1], op: m[2], value: val });
            }
        }
        return this;
    }

    order(column: string, opts?: { ascending?: boolean }) {
        this.orders.push({ column, asc: opts?.ascending ?? true });
        return this;
    }

    range(from: number, to: number) {
        this.ranged = true;
        this.rangeFrom = from;
        this.rangeTo = to;
        return this.execSelect();
    }

    limit(n: number) {
        this.ranged = true;
        this.rangeFrom = 0;
        this.rangeTo = n - 1;
        return this.execSelect();
    }

    single() {
        this.expectSingle = true;
        this.ranged = true;
        this.rangeFrom = 0;
        this.rangeTo = 1;
        return this.execSelect();
    }

    maybeSingle() {
        this.expectMaybeSingle = true;
        this.ranged = true;
        this.rangeFrom = 0;
        this.rangeTo = 1;
        return this.execSelect();
    }

    private async execSelect(): Promise<{ data: any; error: any; count?: number | null }> {
        try {
            const limit = this.rangeTo - this.rangeFrom + 1;
            const offset = this.rangeFrom;
            const parsed = parseEmbeds(this.table, this.columns);
            const res = await apiFetch(this.apiBase, '/v1/data/select', {
                method: 'POST',
                body: JSON.stringify({
                    table: this.table,
                    columns: parsed.baseColumns,
                    filters: this.filters,
                    order: this.orders.map((o) => ({ column: o.column, asc: o.asc })),
                    limit,
                    offset,
                    count: this.wantCount,
                }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                return { data: null, error: { message: j.detail || j.title || res.statusText }, count: null };
            }
            let rows = Array.isArray(j.data) ? j.data : [];
            if (parsed.embeds.length > 0) {
                const enriched = await this.hydrateEmbeds(rows, parsed.embeds);
                if (enriched.error) {
                    return { data: null, error: enriched.error, count: null };
                }
                rows = enriched.data;
            }
            const count = j.count ?? null;
            if (this.expectSingle) {
                if (rows.length !== 1) {
                    return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' }, count };
                }
                return { data: rows[0], error: null, count };
            }
            if (this.expectMaybeSingle) {
                if (rows.length > 1) {
                    return { data: null, error: { message: 'multiple rows returned' }, count };
                }
                return { data: rows[0] ?? null, error: null, count };
            }
            if (this.isHead) return { data: null, error: null, count };
            return { data: rows, error: null, count };
        } catch (e: any) {
            return { data: null, error: { message: e?.message || 'network error' }, count: null };
        }
    }

    then<TResult1 = { data: any; error: any; count?: number | null }, TResult2 = never>(
        onfulfilled?: ((value: { data: any; error: any; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        if (!this.ranged) {
            this.ranged = true;
            this.rangeFrom = 0;
            this.rangeTo = 499;
        }
        return this.execSelect().then(onfulfilled as any, onrejected as any);
    }
}

class InsertBuilder {
    apiBase: string;
    table: string;
    rows: Record<string, any>[];

    constructor(
        apiBase: string,
        table: string,
        rows: Record<string, any>[],
    ) {
        this.apiBase = apiBase;
        this.table = table;
        this.rows = rows;
    }

    select(_cols?: string) {
        const self = this;
        const chain = {
            async single() {
                return self.run(true);
            },
            then(onF: any, onR: any) {
                return chain.single().then(onF, onR);
            },
        };
        return chain;
    }

    async then(onF?: any, onR?: any) {
        return this.run(false).then(onF, onR);
    }

    private async run(single: boolean) {
        try {
            const res = await apiFetch(this.apiBase, '/v1/data/insert', {
                method: 'POST',
                body: JSON.stringify({ table: this.table, rows: this.rows }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = j.detail || j.title || res.statusText;
                const err: any = { message: msg };
                if (String(msg).includes('unique') || String(msg).includes('23505')) err.code = '23505';
                return { data: null, error: err };
            }
            if (single) return { data: j, error: null };
            return { data: j, error: null };
        } catch (e: any) {
            return { data: null, error: { message: e?.message || 'network error' } };
        }
    }
}

class UpdateBuilder {
    filters: Filter[] = [];
    apiBase: string;
    table: string;
    patch: Record<string, any>;

    constructor(
        apiBase: string,
        table: string,
        patch: Record<string, any>,
    ) {
        this.apiBase = apiBase;
        this.table = table;
        this.patch = patch;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, op: 'eq', value });
        return this;
    }

    select(_cols?: string) {
        const self = this;
        return {
            async single() {
                return self.run();
            },
            then(onF: any, onR: any) {
                return self.run().then(onF, onR);
            },
        };
    }

    async then(onF?: any, onR?: any) {
        return this.run().then(onF, onR);
    }

    private async run() {
        try {
            const res = await apiFetch(this.apiBase, '/v1/data/update', {
                method: 'POST',
                body: JSON.stringify({ table: this.table, patch: this.patch, filters: this.filters }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) return { data: null, error: { message: j.detail || j.title } };
            return { data: j.data, error: null };
        } catch (e: any) {
            return { data: null, error: { message: e?.message } };
        }
    }
}

class DeleteBuilder {
    filters: Filter[] = [];
    apiBase: string;
    table: string;

    constructor(
        apiBase: string,
        table: string,
    ) {
        this.apiBase = apiBase;
        this.table = table;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, op: 'eq', value });
        return this;
    }

    async then(onF?: any, onR?: any) {
        try {
            const res = await apiFetch(this.apiBase, '/v1/data/delete', {
                method: 'POST',
                body: JSON.stringify({ table: this.table, filters: this.filters }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) return { data: null, error: { message: j.detail || j.title } };
            return { data: null, error: null };
        } catch (e: any) {
            return { data: null, error: { message: e?.message } };
        }
    }
}

class TableRef {
    apiBase: string;
    table: string;

    constructor(
        apiBase: string,
        table: string,
    ) {
        this.apiBase = apiBase;
        this.table = table;
    }

    select(columns?: string, opts?: { count?: string; head?: boolean }) {
        const q = new QueryBuilder(this.apiBase, this.table);
        return q.select(columns, opts);
    }

    insert(rowOrRows: Record<string, any> | Record<string, any>[]) {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        return new InsertBuilder(this.apiBase, this.table, rows);
    }

    upsert(row: Record<string, any>, opts?: { onConflict?: string }) {
        const self = this;
        return {
            select(_c?: string) {
                return {
                    async single() {
                        const res = await apiFetch(self.apiBase, '/v1/data/upsert', {
                            method: 'POST',
                            body: JSON.stringify({
                                table: self.table,
                                row,
                                onConflict: opts?.onConflict ?? '',
                            }),
                        });
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok) return { data: null, error: { message: j.detail || j.title } };
                        return { data: j, error: null };
                    },
            then(_onF: any, _onR: any) {
                return this.single().then(_onF, _onR);
                    },
                };
            },
        };
    }

    update(patch: Record<string, any>) {
        return new UpdateBuilder(this.apiBase, this.table, patch);
    }

    delete() {
        return new DeleteBuilder(this.apiBase, this.table);
    }
}

export function createGoClient(apiBase: string) {
    return {
        from(table: string) {
            return new TableRef(apiBase, table);
        },
        auth: {
            async getSession() {
                const t = getAccessToken();
                if (!t) return { data: { session: null }, error: null };
                const r = localStorage.getItem(REFRESH_KEY);
                return { data: { session: sessionFromTokens(t, r) }, error: null };
            },
            async getUser() {
                const s = await this.getSession();
                return { data: { user: s.data.session?.user ?? null }, error: null };
            },
            async getMe() {
                const res = await apiFetch(apiBase, '/v1/auth/me');
                if (res.status === 401) return { data: null, error: { message: 'Unauthorized' } };
                const j = await res.json().catch(() => ({}));
                if (!res.ok) return { data: null, error: { message: j.detail || j.title || 'Request failed' } };
                return { data: j, error: null };
            },
            onAuthStateChange(cb: AuthListener) {
                authListeners.add(cb);
                return {
                    data: {
                        subscription: {
                            unsubscribe() {
                                authListeners.delete(cb);
                            },
                        },
                    },
                };
            },
            async signInWithPassword(creds: { email: string; password: string }) {
                const res = await apiFetch(apiBase, '/v1/auth/login', {
                    method: 'POST',
                    body: JSON.stringify(creds),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return { data: { session: null, user: null }, error: { message: j.detail || j.title || 'Login failed' } };
                }
                setTokens(j.access_token, j.refresh_token);
                const session = sessionFromTokens(j.access_token, j.refresh_token);
                emitAuthChange('SIGNED_IN', session);
                return { data: { session, user: session.user }, error: null };
            },
            async signUp(creds: {
                email: string;
                password: string;
                options?: { data?: { name?: string; full_name?: string } };
            }) {
                const res = await apiFetch(apiBase, '/v1/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: creds.email,
                        password: creds.password,
                        name: creds.options?.data?.full_name ?? creds.options?.data?.name ?? '',
                    }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return { data: { session: null, user: null }, error: { message: j.detail || j.title || 'Registration failed' } };
                }
                setTokens(j.access_token, j.refresh_token);
                const session = sessionFromTokens(j.access_token, j.refresh_token);
                emitAuthChange('SIGNED_IN', session);
                return { data: { session, user: session.user }, error: null };
            },
            async signOut() {
                await apiFetch(apiBase, '/v1/auth/logout', { method: 'POST' }).catch(() => null);
                clearTokens();
                emitAuthChange('SIGNED_OUT', null);
                return { error: null };
            },
            async resetPasswordForEmail(_email: string, _opts?: { redirectTo?: string }) {
                const res = await apiFetch(apiBase, '/v1/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: _email,
                        redirect_to: _opts?.redirectTo ?? '',
                    }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return { data: {}, error: { message: j.detail || j.title || 'Password reset request failed' } };
                }
                return { data: {}, error: null };
            },
            async resetPasswordWithToken(token: string, password: string) {
                const res = await apiFetch(apiBase, '/v1/auth/reset-password', {
                    method: 'POST',
                    body: JSON.stringify({ token, password }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                    return { data: {}, error: { message: j.detail || j.title || 'Password reset failed' } };
                }
                return { data: {}, error: null };
            },
            async updateUser(attrs: { password?: string }) {
                if (!attrs.password) {
                    return { data: { user: null }, error: { message: 'Password is required' } };
                }
                if (attrs.password.length < 8) {
                    return { data: { user: null }, error: { message: 'Password must be at least 8 characters' } };
                }
                const res = await apiFetch(apiBase, '/v1/auth/update-password', {
                    method: 'POST',
                    body: JSON.stringify({ password: attrs.password }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) return { data: { user: null }, error: { message: j.detail || j.title } };
                const u = await this.getUser();
                return { data: { user: u.data.user }, error: null };
            },
        },
        storage: {
            from(_bucket: string) {
                return {
                    upload: async (path: string, file: File | Blob, opts?: { upsert?: boolean; contentType?: string }) => {
                        const ctype =
                            opts?.contentType ??
                            ((typeof File !== 'undefined' && file instanceof File ? file.type : '') || 'application/octet-stream');
                        const res = await apiFetch(apiBase, '/v1/storage/presign-upload', {
                            method: 'POST',
                            body: JSON.stringify({ key: path, content_type: ctype }),
                        });
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok) {
                            return { error: { message: j.detail || j.title || 'presign upload failed' } };
                        }
                        const put = await fetch(j.url, { method: 'PUT', headers: { 'Content-Type': ctype }, body: file });
                        if (!put.ok) {
                            return { error: { message: `upload failed (${put.status})` } };
                        }
                        return { error: null };
                    },
                    download: async (path: string) => {
                        const res = await apiFetch(apiBase, '/v1/storage/presign-download', {
                            method: 'POST',
                            body: JSON.stringify({ key: path }),
                        });
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok) {
                            return { data: null, error: { message: j.detail || j.title || 'presign download failed' } };
                        }
                        const fileRes = await fetch(j.url);
                        if (!fileRes.ok) {
                            return { data: null, error: { message: 'download failed' } };
                        }
                        return { data: await fileRes.blob(), error: null };
                    },
                    remove: async (paths: string[]) => {
                        for (const p of paths) {
                            const res = await apiFetch(apiBase, '/v1/storage/delete', {
                                method: 'POST',
                                body: JSON.stringify({ key: p }),
                            });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok) {
                                return { error: { message: j.detail || j.title || 'delete failed' } };
                            }
                        }
                        return { error: null };
                    },
                };
            },
        },
    };
}
