# Monthly expense reports — Phase 4

> Current behavior: saved workbooks can now be revised without an expense reupload; date review is mandatory before confirmation. See the backend [final financial readiness report](../../smithsons-logistics/docs/final-financial-readiness.md). This Phase 4 report records the earlier implementation.

## Scope and workflow

The existing DHL Payout Reports page now includes Upload Expenses Excel and an inline Monthly Expense Reports panel. Existing DHL upload, summary filters, reconciliation and manual payslip handlers are unchanged.

1. Select the reporting month and an XLSX workbook. Optionally provide a worksheet name and raw trips workbook for date checks.
2. Preview through the authenticated Phase 3 API. Review missing data and source completeness before verifying the reporting month.
3. Classify unknown columns as an expense or explicitly ignore them. Enter a review note. Correct blank expense cells or explicitly confirm zero. Provide evidence for any verified no-activity truck.
4. Update the preview after decisions change. All totals, commission, differences and validation readiness come from the backend; React only formats decimal strings.
5. Save a draft. Resolve blocking issues before confirming through an explicit confirmation dialog.
6. View server summary totals and expandable truck breakdowns. Select previous versions, export Excel/PDF, or create a corrected version by reselecting the workbook.

Confirmed snapshots are never edited in place. Corrected imports retain approved header mappings but require new cell corrections and revenue verification, avoiding source-cell decisions being applied to a different workbook layout. Manual comparison columns require verification; NET PAID I/1/2 are excluded as final-net choices. One-cent differences are labeled rounding-sized.

## Files

- src/pages/reports/DhlReportsPage.jsx: entry button and inline panel integration.
- src/pages/reports/MonthlyExpenseReports.jsx: upload, review, drafts, confirmation, history and export workflow.
- src/pages/reports/monthlyExpenseUi.js: formatting, request construction and friendly validation/error messages.
- src/pages/reports/MonthlyExpenseReports.css: responsive styles scoped to the new panel.
- tests/monthlyExpenseUi.test.mjs: 14 isolated helper tests.
- tests/monthlyExpenses.browser.test.mjs: 7 browser acceptance tests with intercepted APIs and synthetic records.

## API limitations and prerequisites

No backend changes were needed. There is no history-by-month listing endpoint. The UI requests the current confirmed report; if absent, it requests version 1 and uses its version list to retrieve the latest saved draft. A drafts-only month is explicitly labeled unconfirmed. This relies on version 1 remaining available, as in the existing append-only lifecycle.

The API has no saved-workbook download or draft PATCH endpoint. Reviewing/correcting a saved import requires selecting the original workbook again and saving a new version. The UI does not pretend to update the stored document directly.

The reporting month is separate from legacy start/end filters, which may describe partial months. Authenticated Axios and backend download endpoints are reused unchanged. Phase 2 schema and Phase 3 routes must be available in the target environment before use; no migration or deployment was performed here.

## Verification

- `node --test tests/monthlyExpenseUi.test.mjs`: 14 passed.
- Browser tests: 7 passed against local Vite, using Node's test runner and Playwright. Set PLAYWRIGHT_MODULE to an installed Playwright module and CHROME_PATH if using system Chrome; FRONTEND_TEST_URL defaults to http://127.0.0.1:8067. Run `node --test tests/monthlyExpenses.browser.test.mjs` with the local frontend running.
- Covered upload/preview, category approval, blanks and explicit zero, missing versus verified zero revenue, manual references, negative balances, draft/confirm, immutable version history, exports, failures/duplicates, single submission, compact layout and existing DHL/manual payslip/reconciliation controls.
- Browser APIs were intercepted; no production requests or real financial decisions were made. Browser export tests verify authenticated requests/download behavior, not the backend PDF generator's contents.
- Production build succeeds. Existing bundle-size and stale Browserslist warnings remain.
- No frontend test framework was installed; tests use Node built-ins and the locally available browser runtime.

## Financial review still required

Synthetic screenshots and browser records do not approve actual February figures. The real workbook's blank cells (including the previously identified D17), DHL completeness/date discrepancies, and no-activity claims still need administrator correction or evidence. The UI leaves unavailable figures unavailable, preserves negative balances, and blocks confirmation according to backend validation. Previously unverified manual columns remain unverified until explicitly checked.

No backend, authentication, financial calculation, production record, migration, deployment or delivery behavior was changed in Phase 4. No commit or push was performed.
