# RLS → Go authorization map

Former Supabase RLS expressed row visibility in SQL policies. The Go API must enforce the same intent in handlers and in `internal/data` (table registry + filter injection).

| Concern | Former pattern (conceptual) | Go implementation |
|---------|------------------------------|-------------------|
| Company isolation | `company_id` in JWT / membership | User carries `CompanyIDs` from `user_companies`; queries scoped by company |
| Profile vs employee | Different policies per table | `ctx.User.IsEmployee` + employee ID / company |
| Owner / role caps | Role checks in RLS | Membership `role` + explicit checks in `/api/*` handlers |
| Invitations | Token + pending status | `companyhttp` / data rules for `invite_token`, `invite_status` |

**Process**: When debugging a permission bug, locate the old RLS policy name in Supabase history, then add or tighten the matching check in Go (prefer one helper per invariant, e.g. `userCanAccessCompany(u, id)`).

This file is intentionally brief; extend it as policies are ported table by table.
