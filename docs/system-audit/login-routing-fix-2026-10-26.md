# Role-aware sign-in dashboard routing

## Cause

The credentials form returned to `sessionStorage["application-return"]` before checking account roles. A Master Super Admin signing in from the public library therefore returned to that public location. Google callbacks also preferred that location, and the credentials form's session-fetch failure path silently selected the public dashboard.

## Result

- Credentials, Google sign-in and registration completion use the server `/auth/continue` handler. It reloads the authenticated account and selects the destination from current roles.
- Master Super Admin and Super Admin accounts open `/super-admin/dashboard`. Assigned language administrators, editors, uploaders and publishers open `/admin/dashboard`. Other users return to a validated public-library location or `/dashboard`.
- A remembered public location cannot override an administrative role. It is consumed once and constrained to internal public-application routes. Client-side role claims and arbitrary return URLs cannot grant administrative access.
- Native authorization callbacks retain their validated handoff. After a new native sign-in, trusted account data selects `/workspace` for staff and `/account` for public users. Intentional later public browsing remains available.
- The public account menu now includes the assigned admin-dashboard destination. Its sidebar staff link opens the full role-specific web dashboard on the web and the embedded staff workspace in the native client.
- Server authentication failures no longer silently redirect administrators to the public dashboard. Existing dashboard authorization remains enforced separately from destination selection.

## Verification

- 208 automated tests passed, including the actual credentials/Google form handlers, Master Super Admin with `isSuperAdmin: false`, all assigned staff duties, public users, unsafe returns, stale remembered returns and native callback preservation.
- 17 hydrated browser cases exercised the real login form and continuation handler with fixture authentication, plus native staff/public landing. No real credentials or account changes were used.
- Production and mobile-client builds both passed, including their TypeScript checks. Browser cases validate routing with isolated sessions; they do not claim to have signed in as the user's live account.

Evidence: [automated suite](login-routing-tests-2026-10-26.log), [browser cases](login-routing-browser-verification-2026-10-26.json), [browser log](login-routing-browser-2026-10-26.log), [production build](login-routing-build-2026-10-26.log), [mobile build](login-routing-mobile-build-2026-10-26.log).

The hosted application needs the updated build deployed. This repair does not change outstanding translation work or formal PRD/NRF acceptance totals.
