# Recovry — Project Roadmap

## Stack
- [x] React + Vite + Express + tRPC + Drizzle + MySQL + shadcn/ui
- [x] Keep business logic portable across environments

## 0. Foundation
- [x] Global theme and design tokens in `client/src/index.css` for a clean clinical look
- [x] Add the shadcn/ui components needed: Slider, Progress, Select, Tabs, Table, Toast, Badge, Dialog
- [x] Chapter 3 notes: `docs/fyp-chapter3-diffs.md`

## 1. Authentication and RBAC
- [x] OAuth-based authentication
- [x] Extend the role enum to `client | physiotherapist | admin` (admin = Clinic Admin)
- [x] Add an account status field (`pending | active | suspended`)
- [x] Add `clientProcedure`, `physioProcedure`, and `adminProcedure` helpers in tRPC
- [x] Role-aware `Home` page that redirects to the correct dashboard after login
- [x] Unit tests for role guard failures

## 2. Database Schema
- [x] `users`: `role`, `status`, `languagePreference`, `physiotherapistId` (FK for clients)
- [x] `exercises`: `title`, `instructionsEn`, `instructionsKh`, `videoUrl`, `defaultReps`, `createdBy`
- [x] `assignments`: `exerciseId`, `physiotherapistId`, `clientId`, `reps`, `startDate`, `endDate`, `status`
- [x] `feedbackLogs`: `assignmentId`, `clientId`, `painScore` (0–10), `completed`, `notes`, `submittedAt`
- [x] Generate migration SQL with drizzle-kit and apply it with `drizzle-kit migrate`
- [x] Query helpers in `server/db.ts`
- [x] Seed demo data for one Clinic Admin, one Physiotherapist, one Client, two exercise templates, two assignments, and three feedback logs

## 3. Localization
- [x] Install i18n library (react-intl)
- [x] Message catalogs: `client/src/i18n/messages/en.json` and `client/src/i18n/messages/kh.json`
- [x] Persist language preference in `users.languagePreference`
- [x] Language toggle component in the top nav (EN / ខ្មែរ)
- [x] All UI strings localized via `<FormattedMessage />` or `intl.formatMessage`

## 4. Clinic Admin User Management
- [x] `/admin/users` page with filter by role
- [x] Approve, suspend, and delete actions
- [x] Edit dialog for name, email, role, status, and physiotherapist assignment

## 5. Physiotherapist Exercise Management
- [x] `/physio` Exercises tab: list / create / edit / delete
- [x] Form fields for title, instructionsEn, instructionsKh, videoUrl, and defaultReps
- [x] Assign exercises to clients with reps, startDate, and endDate
- [x] List and manage active assignments

## 6. Client Exercise Access
- [x] `/client/today` listing today's active assignments
- [x] Embedded video + bilingual instructions based on `languagePreference`

## 7. Client Feedback Submission
- [x] Daily feedback dialog per assignment
- [x] Pain slider 0–10 with live colour-coded label
- [x] Completion toggle (Switch)
- [x] Optional notes textarea
- [x] `/client/history` with chart + stats

## 8. Physiotherapist Monitoring Dashboard
- [x] Client roster (clients assigned to the physio) with completion %
- [x] Per-client detail page: pain trend + session history
- [x] Monitoring overview: aggregate pain trend, high-pain alerts, totals

## 9. UI Shell
- [x] `AppShell` with responsive top bar
- [x] Language toggle pinned in top bar for all roles
- [x] Dev-only impersonation dropdown visible only to Clinic Admin

## 10. Testing
- [x] Vitest: RBAC enforcement across admin / physio / clientApp routers
- [x] Vitest: pain score validation (0–10)
- [x] Vitest: language preference input validation
- [x] Updated `auth.logout.test.ts` to expect impersonation cookie clearing
- [x] `pnpm test` passes (12 passed / 0 failed)

## 11. Delivery
- [x] Save checkpoint (v735eec7f)
- [x] Write `/home/ubuntu/FYP_Chapter3_Diffs.md` with the exact edits needed in Chapter 3
- [x] Push to branch `manus-implementation` on `Kuyhavtea/recovry` fork
- [x] Deliver preview link and summary to the user

## 12. Dev Impersonation
- [x] `impersonatedUserId` cookie overrides `ctx.user` in development
- [x] tRPC procedure `dev.impersonate({ userId })` admin-only, dev-mode-only
- [x] tRPC procedure `dev.stopImpersonation()` admin-only, dev-mode-only
- [x] Top-bar role switcher visible when user is admin (select among seeded users)
- [x] Production impersonation disabled (server rejects the mutation)


## 13. Bug Fixes
- [x] Silence the react-intl `MISSING_DATA` warning for the Khmer locale.
- [x] Redirect non-matching roles before protected tRPC queries run.
- [x] Re-run Vitest: 12 passed / 0 failed
