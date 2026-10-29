// Presentation/request helpers only. All financial arithmetic belongs to the API.
export const ROOT = '/dhl-reports';
export const STATUS_LABELS = { preview: 'Preview', draft: 'Draft', confirmed: 'Current confirmed', superseded: 'Superseded' };
export const FINANCIAL_LABELS = { gross: 'DHL gross revenue', operating_expenses: 'Operating expenses', commission_base: 'Commission base', commission: '7% commission', net_payable: 'Net payable' };
export const COMPARISON_LABELS = {
  exact_match: 'Exact match', rounding_difference: 'Rounding-sized difference', material_difference: 'Review difference',
  missing_reference: 'Manual value missing', unverified_reference: 'Column meaning not verified',
  invalid_reference: 'Manual value is invalid', ambiguous_reference: 'Manual column needs review',
  reference_formula_cache_missing: 'Recalculate the manual workbook first', calculation_unavailable: 'Calculation not available',
};
export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
export function monthDate(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a reporting month.');
  return `${month}-01`;
}
export function monthLabel(month) {
  return new Intl.DateTimeFormat('en-KE', { month: 'long', year: 'numeric' }).format(new Date(`${monthDate(month).slice(0, 7)}-15T12:00:00`));
}
export function formatKes(value) {
  if (value === null || value === undefined) return 'Not available';
  const match = String(value).match(/^([+-]?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return 'Not available';
  return `KES ${match[1]}${match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${(match[3] || '').padEnd(2, '0')}`;
}
export function negative(value) { return /^-/.test(String(value)) && /[1-9]/.test(String(value)); }
export function normalizeHeader(value) { return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, ' ').trim().replace(/\s+/g, ' '); }
export function referenceCandidates(headers = []) {
  const allowed = { gross: ['gross amount'], commission: ['7 commission'], operating_expenses: ['operating expenses', 'total operating expenses', 'total expenses'], net_payable: ['net pay', 'net paid'] };
  return Object.fromEntries(Object.entries(allowed).map(([key, aliases]) => [key, headers.filter(h => aliases.includes(normalizeHeader(h.original_header))).map(h => h.original_header)]));
}
export function cellLabel(row, cell) {
  return Object.values(row.deductions || {}).find(d => d.source_cell === cell)?.label || cell;
}
export function issueText(issue, row) {
  const truck = row ? `${row.normalized_plate}: ` : '';
  const messages = {
    blank_expense_zero: 'Blank spreadsheet expense interpreted as KES 0.00 and recorded in the audit.',
    category_absent_zero: issue.message || 'Expense category absent from this workbook; KES 0.00 assumed.',
    optional_category_absent: 'Kasarani fuel column was not included. KES 0.00 assumed.',
    source_dates_unreviewed: 'Attach the raw trips workbook and review its dates before confirming.',
    source_manifest_mismatch: 'The raw trips workbook does not match the saved DHL records. Check which source was imported.',
    source_gross_inconsistent: 'Stored DHL charges and gross do not agree. Ask support to review the source.',
    source_unverified: 'Check that the DHL upload covers the complete reporting month before confirming.',
    unknown_column: 'Choose whether the new spreadsheet column is an expense or should be ignored.',
    duplicate_category: 'Two columns have been assigned to the same expense category. Review the category choices.',
    duplicate_header: 'The workbook has duplicate column headings. Correct the workbook before confirming.',
    duplicate_truck: 'This truck appears more than once. Correct the duplicate rows in the workbook.',
    vehicle_unmatched: 'The truck registration could not be matched. Check it against the vehicle register.',
    vehicle_ambiguous: 'The truck registration matches more than one vehicle. Ask support to check it.',
    revenue_unverified: 'DHL revenue has not been verified for the selected month.',
    no_matching_transport_revenue: 'This truck has no verified DHL revenue for the selected month.',
    zero_revenue: 'Verified gross revenue is KES 0.00. Expenses are still included.',
    no_matching_transport_revenue_verified_zero: 'No monthly business was explicitly verified. Expenses are still included.',
    negative_net_balance_review: 'Expenses exceed gross revenue. Review the negative balance; nothing has been written off.',
    no_activity_conflict: 'DHL records exist for this truck. It cannot be confirmed as having no business.',
    preview_unresolved: 'Review the remaining workbook and expense issues before confirming.',
    month_mismatch: 'The month in the workbook does not match the selected reporting month.',
    month_unverified: 'The workbook does not identify its month. Check the title before uploading again.',
    historical_adjustment_review: 'Some DHL records are dated outside the selected reporting month. Review these separately.',
    raw_adjustments_not_reviewed: 'The raw trips workbook has not been checked for entries outside this month.',
  };
  if (['blank_expense', 'invalid_expense', 'formula_cache_missing'].includes(issue.code)) {
    return `${truck}${cellLabel(row || {}, issue.cell)} amount ${issue.code === 'blank_expense' ? 'is missing' : 'needs checking'}. Please confirm zero or enter the correct amount.`;
  }
  if (issue.code === 'dhl_missing' || issue.code === 'dhl_unimported') return `${truck}This truck has no DHL revenue for the selected month. Missing records are not confirmed zero business.`;
  if (issue.code === 'dhl_incomplete') return `${truck}The month's DHL data has not been checked as complete.`;
  return truck + (messages[issue.code] || issue.message || 'Review this item.');
}
export function rowIssues(row) {
  const issues = row.issues || [];
  return issues.filter(i => !(i.code === 'preview_unresolved' && issues.some(other => other.blocking && other.code !== i.code)));
}
export function buildOptions(config) {
  const approved_mappings = { ...config.mappings };
  if (Object.values(approved_mappings).some(label => label !== null && !label.trim())) throw new Error('Enter a name for each approved expense category.');
  const corrections = Object.fromEntries(Object.entries(config.corrections).filter(([, value]) => value.trim() !== ''));
  if (Object.values(corrections).some(value => !/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(value.trim()))) throw new Error('Enter valid amounts for the corrections. Use 0.00 only when you have confirmed zero.');
  if ((Object.keys(approved_mappings).length || Object.keys(corrections).length || config.previousId) && !config.reason.trim()) throw new Error('Explain the category choices or corrections before updating the preview.');
  if (config.sourceChecked && !config.sourceReference.trim()) throw new Error('Explain how you checked that the monthly DHL data is complete.');
  if (Object.values(config.noActivity).some(reason => !reason.trim())) throw new Error('Explain how you verified no monthly business for each selected truck.');
  const reference_columns = config.referencesChecked ? Object.fromEntries(Object.entries(config.referenceColumns).filter(([, value]) => value)) : {};
  if (Object.keys(reference_columns).length && !config.referenceReason.trim()) throw new Error('Explain how you verified the meaning of the manual comparison columns.');
  if (Object.values(config.dateDispositions || {}).some(d => d.action && !d.reason?.trim())) throw new Error('Explain why each historical row is excluded from this reporting month.');
  return {
    approved_mappings, corrections, reason: config.reason,
    verified_no_activity: { ...config.noActivity },
    source_verification: config.sourceChecked ? config.sourceReference.trim() : '',
    previous_version_id: config.previousId || null,
    sheet_name: config.sheetName.trim() || null,
    date_dispositions: Object.fromEntries(Object.entries(config.dateDispositions || {}).filter(([, decision]) => decision.action)),
    reference_columns, reference_verification: Object.keys(reference_columns).length ? config.referenceReason : '',
  };
}
export function uploadForm(file, month, options, rawFile) {
  if (!file) throw new Error('Choose an expense workbook.');
  for (const workbook of [file, rawFile].filter(Boolean)) {
    if (!/\.xlsx$/i.test(workbook.name)) throw new Error('Choose an Excel .xlsx workbook.');
    if (workbook.size > 20_000_000) throw new Error('Each workbook must be no larger than 20 MB.');
  }
  const form = new FormData();
  form.append('file', file); form.append('month', monthDate(month)); form.append('options', JSON.stringify(options));
  if (rawFile) form.append('raw_trips_file', rawFile);
  return form;
}
export async function apiError(error) {
  let data = error.response?.data;
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try { data = JSON.parse(await data.text()); } catch { data = null; }
  }
  const status = error.response?.status;
  const detail = data?.detail;
  const code = detail?.code;
  let message;
  if (status === 401) message = 'Your session has expired. Sign in again to continue.';
  else if (status === 403) message = 'Only an administrator can manage monthly expense reports.';
  else if (status === 503) message = code === 'migration_required' ? 'Monthly expense reports are not ready yet. Please contact support to complete setup.' : 'The reporting service is busy or unavailable. Please try again.';
  else if (code === 'duplicate_import') message = 'This workbook has already been uploaded. Open the saved report to review it.';
  else if (code === 'SourceChanged') message = 'DHL revenue changed after this draft was prepared. Create and review a new version before confirming.';
  else if (code === 'VersionConflict' || status === 409) message = 'Another report or version conflicts with this change. Reload the saved report before preparing a correction.';
  else if (status >= 500) message = 'The report could not be processed. Please try again or contact support.';
  else if (error.isAxiosError && !error.response) message = 'Cannot connect to the reporting service. Check your connection and try again.';
  else if (status === 404) message = 'The requested monthly report was not found.';
  else if (Array.isArray(detail)) message = detail.map(item => item.msg).join(' ');
  else message = (typeof detail === 'string' ? detail : detail?.message) || error.message || 'The request failed. Please try again.';
  return { message, duplicateId: code === 'duplicate_import' ? detail.existing_import_id : null };
}

export function revisionForm(config, options, rawFile) {
  const form = new FormData();
  form.append('options', JSON.stringify(options));
  form.append('expected_file_sha256', config.storedHash);
  if (rawFile) {
    if (!/\.xlsx$/i.test(rawFile.name) || rawFile.size > 20_000_000) throw new Error('Choose a raw Excel .xlsx workbook no larger than 20 MB.');
    form.append('raw_trips_file', rawFile);
  }
  return form;
}
