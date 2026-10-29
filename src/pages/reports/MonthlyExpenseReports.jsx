import React, { useEffect, useRef, useState } from 'react';
import axiosAuth from '../../utils/axiosAuth';
import './MonthlyExpenseReports.css';
import {
  ROOT, STATUS_LABELS, FINANCIAL_LABELS, COMPARISON_LABELS, currentMonth, monthDate, monthLabel,
  formatKes, negative, referenceCandidates, issueText, rowIssues, buildOptions, uploadForm, revisionForm, apiError,
} from './monthlyExpenseUi';

const initialConfig = () => ({ mappings: {}, corrections: {}, noActivity: {}, sourceChecked: false,
  sourceReference: '', reason: '', previousId: null, sheetName: '', referencesChecked: false,
  referenceColumns: {}, referenceReason: '', dateDispositions: {}, storedId: null, storedHash: '' });

function ComparisonTable({ row }) {
  const entries = Object.entries(row.comparisons || {});
  if (!entries.some(([, comparison]) => comparison.status !== 'unverified_reference')) {
    return <p className="text-sm text-slate-500">Manual figures are not being compared until their column meanings are verified.</p>;
  }
  return <div className="overflow-x-auto"><table className="app-table" aria-label={`Manual comparison for ${row.normalized_plate}`}>
    <thead><tr>{['Figure', 'Manual value', 'Smithsons calculated', 'Difference', 'Review'].map(label => <th key={label}>{label}</th>)}</tr></thead>
    <tbody>{entries.map(([key, comparison]) => <tr key={key}>
      <td>{FINANCIAL_LABELS[key]}</td><td>{formatKes(comparison.manual)}</td><td>{formatKes(row[key])}</td>
      <td>{formatKes(comparison.difference)}</td><td className={comparison.status === 'material_difference' ? 'text-rose-700 font-semibold' : comparison.status === 'rounding_difference' ? 'text-amber-800' : ''}>{COMPARISON_LABELS[comparison.status] || 'Needs review'}</td>
    </tr>)}</tbody>
  </table><p className="text-xs text-slate-500 mt-2">Difference means Smithsons calculated minus manual. One-cent differences are rounding-sized, not exact matches.</p></div>;
}

function TruckTable({ report, editable, config, change, disabled }) {
  const [expanded, setExpanded] = useState({});
  useEffect(() => setExpanded({}), [report.id, report.status, report.reporting_month]);
  return <div className="overflow-x-auto"><table className="app-table min-w-[920px]" aria-label="Monthly expense truck figures">
    <thead><tr>{['Truck', 'DHL gross', 'Operating expenses', 'Commission base', '7% commission', 'Net payable', 'Review'].map(label => <th key={label}>{label}</th>)}</tr></thead>
    <tbody>{report.rows.map(row => {
      const key = `${row.source_worksheet}-${row.source_row}`;
      const issues = rowIssues(row);
      const blocking = row.issues.some(i => i.blocking);
      const noRecords = !row.dhl_source_snapshot?.length;
      return <React.Fragment key={key}>
        <tr>
          <td><button type="button" className="text-violet-700 font-semibold underline underline-offset-4" aria-label={`Details for ${row.normalized_plate}`} aria-expanded={!!expanded[key]} onClick={() => setExpanded(previous => ({ ...previous, [key]: !previous[key] }))}>{row.normalized_plate}</button><p className="text-xs text-slate-500 mt-1">{row.vehicle_owner_snapshot?.owner_name || 'Owner unassigned'}</p></td>
          {['gross', 'operating_expenses', 'commission_base', 'commission', 'net_payable'].map(field => <td key={field} className={`whitespace-nowrap ${negative(row[field]) ? 'text-rose-700 font-semibold' : ''}`}>{formatKes(row[field])}</td>)}
          <td><span className={`text-xs font-semibold ${blocking ? 'text-rose-700' : issues.length ? 'text-amber-800' : 'text-emerald-700'}`}>{blocking ? 'Needs attention' : issues.length ? 'Review warning' : 'Checked'}</span></td>
        </tr>
        {expanded[key] && <tr><td colSpan={7} className="bg-violet-50/40">
          <div className="space-y-4 min-w-0">
            {issues.length > 0 && <ul className="list-disc pl-5 text-sm space-y-1">{issues.map((issue, index) => <li key={`${issue.code}-${index}`} className={issue.blocking ? 'text-rose-700' : 'text-amber-900'}>{issueText(issue, row)}</li>)}</ul>}
            <fieldset disabled={disabled} className="space-y-3">
              <legend className="font-semibold text-violet-900 mb-2">Expense breakdown</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(row.deductions).map(([category, expense]) => <div key={category} className="bg-white border border-violet-100 rounded-xl p-3">
                  <p className="font-medium text-sm">{expense.label}</p><p className="mt-1">{formatKes(expense.amount)}</p>
                  {expense.resolution === 'absent_optional_category' && <p className="text-xs text-amber-800">Column absent; zero assumed with a recorded warning.</p>}
                  {editable && expense.source_cell && <div className="mt-2 space-y-2">
                    <label className="block text-xs text-slate-600">{expense.amount == null ? 'Enter the missing amount' : 'Correction, if needed'}
                      <input type="text" inputMode="decimal" className="app-input mt-1 w-full" aria-label={`Amount for ${row.normalized_plate} ${expense.label}`} value={config.corrections[expense.source_cell] ?? ''} placeholder={expense.amount == null ? 'Enter amount' : 'Leave blank to keep workbook amount'} onChange={event => change('corrections', { ...config.corrections, [expense.source_cell]: event.target.value })} />
                    </label>
                    {expense.amount == null && <button type="button" className="app-button-secondary text-xs" onClick={() => change('corrections', { ...config.corrections, [expense.source_cell]: '0.00' })}>Confirm zero for {expense.label}</button>}
                  </div>}
                </div>)}
              </div>
              {editable && noRecords && <div className="border border-amber-200 rounded-xl bg-amber-50 p-3 space-y-2">
                <p className="text-sm">This truck has no DHL revenue records for the selected month. Missing data is not confirmed zero business.</p>
                <label className="flex gap-2 items-start text-sm"><input type="checkbox" className="mt-1" checked={Object.hasOwn(config.noActivity, row.normalized_plate)} onChange={event => {
                  const next = { ...config.noActivity }; if (event.target.checked) next[row.normalized_plate] = ''; else delete next[row.normalized_plate]; change('noActivity', next);
                }} />I verified that {row.normalized_plate} had no business this month.</label>
                {Object.hasOwn(config.noActivity, row.normalized_plate) && <label className="block text-sm">How did you verify no business?
                  <input className="app-input w-full mt-1" value={config.noActivity[row.normalized_plate]} onChange={event => change('noActivity', { ...config.noActivity, [row.normalized_plate]: event.target.value })} />
                </label>}
              </div>}
            </fieldset>
            <ComparisonTable row={row} />
          </div>
        </td></tr>}
      </React.Fragment>;
    })}</tbody>
  </table></div>;
}

function SourceDateReview({ report, editable, config, change, disabled }) {
  const review = report.decisions?.historical_review;
  const rows = review?.date_issues || [];
  if (!review) return <p className="text-sm text-amber-900">Original raw trips workbook is required before this report can be confirmed.</p>;
  return <div className="space-y-3"><h3 className="font-semibold text-violet-900">Source date review</h3>
    <p className="text-sm">{review.sheet}: {rows.length ? 'Review every affected row. Excluding a historical row does not delete or move it.' : 'All source transaction dates match this reporting month.'}</p>
    {rows.length > 0 && <div className="overflow-x-auto"><table className="app-table" aria-label="Source date issues">
      <thead><tr>{['Excel row', 'Original date', 'Truck', 'Reference', 'Amount', 'Issue and decision'].map(label => <th key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row => {
        const key = String(row.source_row); const decision = config.dateDispositions?.[key] || {};
        const saved = report.decisions?.date_dispositions?.[key];
        return <tr key={key}><td>{row.source_row}</td><td>{row.date || 'Missing'}</td><td>{row.truck}</td><td>{row.reference}</td><td>{row.amount ?? 'Missing'}</td><td><p>{row.reason}</p>
          {editable && row.code === 'out_of_period_date' ? <fieldset disabled={disabled} className="space-y-2">
            <label className="block text-sm">Decision for Excel row {key}<select className="app-select block mt-1" aria-label={`Date decision for row ${key}`} value={decision.action || ''} onChange={event => change('dateDispositions', { ...config.dateDispositions, [key]: { action: event.target.value, reason: decision.reason || '' } })}>
              <option value="">Pending business review</option><option value="exclude_from_period">Explicitly exclude from this reporting month</option>
            </select></label>
            {decision.action && <label className="block text-sm">Review reason for row {key}<input className="app-input w-full mt-1" value={decision.reason || ''} onChange={event => change('dateDispositions', { ...config.dateDispositions, [key]: { ...decision, reason: event.target.value } })} /></label>}
          </fieldset> : <p className="text-sm text-amber-900">{saved ? `Excluded from this month: ${saved.reason}` : 'Unresolved. Source correction or business review is required.'}</p>}
        </td></tr>;
      })}</tbody></table></div>}
  </div>;
}

export default function MonthlyExpenseReports({ uploadOpen, onCloseUpload, onOpenUpload, onBusyChange }) {
  const [month, setMonth] = useState(currentMonth);
  const [report, setReport] = useState(null);
  const [preview, setPreview] = useState(null);
  const [config, setConfig] = useState(initialConfig);
  const [file, setFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [dirty, setDirty] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [duplicateId, setDuplicateId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const section = useRef(null);
  const dialog = useRef(null);
  const active = useRef(true);
  const running = useRef(false);
  const sequence = useRef(0);
  const fileInput = useRef(null);
  const rawInput = useRef(null);
  const display = uploadOpen && preview ? preview : report;
  const versions = preview?.versions?.length ? preview.versions : report?.versions || [];
  const unknowns = (preview?.header_mappings || []).filter(h => h.classification === 'unknown' || h.approval_source === 'administrator');
  const candidates = referenceCandidates(preview?.header_mappings || []);
  const configChanged = (key, value) => { setConfig(previous => ({ ...previous, [key]: value })); setDirty(true); setError(''); };

  useEffect(() => { active.current = true; return () => { active.current = false; sequence.current += 1; }; }, []);
  useEffect(() => { onBusyChange?.(!!busy); }, [busy, onBusyChange]);
  useEffect(() => { if (uploadOpen) section.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [uploadOpen]);

  function clearEditor() {
    setPreview(null); setFile(null); setRawFile(null); setConfig(initialConfig()); setDirty(true);
    if (fileInput.current) fileInput.current.value = '';
    if (rawInput.current) rawInput.current.value = '';
  }
  async function run(kind, task, success, failure) {
    if (running.current) return;
    running.current = true; const request = ++sequence.current;
    setBusy(kind); setError(''); setNotice(''); setDuplicateId(null);
    try {
      const result = await task();
      if (active.current && request === sequence.current) success(result);
    } catch (caught) {
      const info = await apiError(caught);
      if (active.current && request === sequence.current) { setError(info.message); setDuplicateId(info.duplicateId); failure?.(); }
    } finally {
      running.current = false;
      if (active.current && request === sequence.current) setBusy('');
    }
  }
  function acceptReport(data) { setReport(data); clearEditor(); onCloseUpload(); }
  function loadReport(id) {
    run('load', () => axiosAuth.get(`${ROOT}/expense-imports/${id}`).then(response => response.data), data => {
      if (data.reporting_month.slice(0, 7) !== month) { setError('This saved report belongs to a different month. Select its month first.'); return; }
      acceptReport(data);
    });
  }
  function loadMonth() {
    run('load', async () => {
      try { return { data: (await axiosAuth.get(`${ROOT}/monthly-net-summary`, { params: { month: monthDate(month) } })).data }; }
      catch (caught) {
        if (caught.response?.status !== 404) throw caught;
        try {
          const first = (await axiosAuth.get(`${ROOT}/monthly-net-summary`, { params: { month: monthDate(month), version: 1 } })).data;
          const latest = first.versions?.at(-1);
          return { data: latest && latest.id !== first.id ? (await axiosAuth.get(`${ROOT}/expense-imports/${latest.id}`)).data : first, noConfirmed: true };
        } catch (missing) { if (missing.response?.status === 404) return { data: null }; throw missing; }
      }
    }, result => {
      clearEditor(); onCloseUpload(); setReport(result.data);
      if (!result.data) setNotice('No saved monthly expense report was found for this month. Upload an expense workbook to begin.');
      else if (result.noConfirmed) setNotice(`No report is currently confirmed for this month. Showing saved ${STATUS_LABELS[result.data.status].toLowerCase()} version ${result.data.version}.`);
    });
  }
  function newVersion() {
    const decisions = report.decisions || {};
    setConfig({ ...initialConfig(), mappings: decisions.approved_mappings || {},
      corrections: decisions.corrections || {}, noActivity: decisions.verified_no_activity || {},
      dateDispositions: decisions.date_dispositions || {},
      previousId: report.id, storedId: report.id, storedHash: report.file_sha256,
      sheetName: decisions.sheet_name || '', referenceColumns: decisions.reference_columns || {} });
    setPreview({ ...report, id: undefined, version: null, status: 'preview' });
    setFile(null); setRawFile(null); setDirty(true); setError('');
    if (fileInput.current) fileInput.current.value = '';
    if (rawInput.current) rawInput.current.value = '';
  }
  function submitWorkbook(mode) {
    const options = buildOptions(config);
    if (config.storedId) {
      const form = revisionForm(config, options, rawFile); form.append('mode', mode);
      return axiosAuth.post(`${ROOT}/expense-imports/${config.storedId}/revise`, form).then(response => response.data);
    }
    return axiosAuth.post(`${ROOT}/expense-imports${mode === 'preview' ? '/preview' : ''}`, uploadForm(file, month, options, rawFile)).then(response => response.data);
  }
  function updatePreview() {
    run('preview', () => submitWorkbook('preview'), data => { setPreview(data); setDirty(false); setNotice('Preview updated. All figures below were calculated by Smithsons.'); });
  }
  function saveDraft() {
    run('save', () => submitWorkbook('save'), data => { acceptReport(data); setNotice(`Draft version ${data.version} saved. Review it before confirming.`); });
  }
  function closeDialog() { dialog.current?.close(); setDialogOpen(false); }
  function confirmReport() {
    run('confirm', () => axiosAuth.post(`${ROOT}/expense-imports/${report.id}/confirm`).then(response => response.data), data => {
      closeDialog(); setReport(data); setNotice(`Monthly report version ${data.version} confirmed.`);
    }, closeDialog);
  }
  function download(format) {
    run(`export-${format}`, async () => {
      const response = await axiosAuth.get(`${ROOT}/expense-imports/${report.id}/export`, { params: { format }, responseType: 'blob' });
      const filename = response.headers['content-disposition']?.match(/filename="?([^";]+)"?/)?.[1];
      return { blob: response.data, filename: filename && /^[\w.-]+$/.test(filename) ? filename : `smithsons_monthly_transport_${month}_v${report.version}.${format}` };
    }, result => {
      const url = URL.createObjectURL(result.blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = result.filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000); setNotice(`${format.toUpperCase()} report downloaded for version ${report.version}.`);
    });
  }

  return <section ref={section} id="monthly-expense-reports" className="monthly-expense-panel app-card p-4 md:p-6 space-y-5 scroll-mt-4" aria-labelledby="monthly-expense-title" aria-busy={!!busy}>
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div><h2 id="monthly-expense-title" className="app-section-title">Monthly Expense Reports</h2><p className="text-sm text-slate-600 mt-1">Review monthly truck expenses and net balances.</p></div>
      <div className="flex flex-wrap items-end gap-2"><label className="text-sm font-medium text-violet-800">Reporting month
        <input type="month" className="app-input block mt-1" aria-label="Expense reporting month" value={month} disabled={!!busy || dialogOpen} onChange={event => {
          setMonth(event.target.value); setReport(null); clearEditor(); setError(''); setNotice(''); setDuplicateId(null);
        }} /></label>
        <button type="button" className="app-button-secondary" onClick={loadMonth} disabled={!!busy || !month || dialogOpen}>View saved report</button>
      </div>
    </div>
    {error && <div role="alert" className="app-alert-error">{error}{duplicateId && <button type="button" className="block mt-2 underline font-semibold" disabled={!!busy} onClick={() => loadReport(duplicateId)}>Open saved report</button>}</div>}
    {notice && <div role="status" className="app-alert-success">{notice}</div>}
    {busy && <p role="status" className="text-sm text-violet-800">{({ preview: 'Checking the workbook and calculating figures…', save: 'Saving draft…', confirm: 'Confirming monthly report…', load: 'Loading saved report…' })[busy] || 'Preparing download…'}</p>}

    {uploadOpen && <div className="border border-violet-200 rounded-2xl bg-violet-50/30 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-violet-900">Upload Expenses Excel</h3><p className="text-sm text-slate-600 mt-1">Choose the month and workbook, then check the preview before saving.</p></div><button type="button" className="app-button-secondary" disabled={!!busy} onClick={() => { clearEditor(); onCloseUpload(); }}>Cancel upload</button></div>
      <fieldset disabled={!!busy} className="space-y-4">
        {config.storedId && <p className="text-sm text-violet-800">Using the original saved expense workbook. Corrections create a new version and preserve the original.</p>}
        <label className="block text-sm font-medium">Expense workbook (.xlsx, up to 20 MB)
          <input ref={fileInput} type="file" accept=".xlsx" className="app-input block mt-1 w-full" aria-label="Expense workbook" onChange={event => {
            setFile(event.target.files?.[0] || null); setPreview(null); setDirty(true); setConfig(previous => ({ ...initialConfig(), previousId: previous.previousId, mappings: previous.previousId ? previous.mappings : {} })); setError('');
          }} />
        </label>
        {versions.length > 0 && <label className="block text-sm font-medium">Saved version being corrected
          <select className="app-select block mt-1 w-full" value={config.previousId || ''} onChange={event => configChanged('previousId', event.target.value ? Number(event.target.value) : null)}>
            <option value="">Choose the saved version to preserve in history</option>
            {versions.map(version => <option key={version.id} value={version.id}>Version {version.version} ({STATUS_LABELS[version.status]})</option>)}
          </select><span className="block mt-1 text-xs text-slate-600">Saving creates a new draft. Confirmed financial figures are never edited in place.</span>
        </label>}
        {config.previousId && <p className="text-sm text-violet-800">Preparing a new version of a saved report. The saved workbook is available below. Upload a replacement only if the file itself changed.</p>}
        <details className="text-sm"><summary className="cursor-pointer font-medium text-violet-800">Source workbook and date checks</summary><div className="grid md:grid-cols-2 gap-3 mt-3">
          <label>Raw trips workbook (required before confirmation)<input ref={rawInput} type="file" accept=".xlsx" className="app-input block mt-1 w-full" aria-label="Raw trips workbook" onChange={event => { setRawFile(event.target.files?.[0] || null); configChanged('dateDispositions', {}); }} /></label>
          <label>Worksheet name, if there is more than one sheet<input className="app-input block mt-1 w-full" value={config.sheetName} onChange={event => configChanged('sheetName', event.target.value)} /></label>
        </div></details>
        <div className="bg-white border border-violet-100 rounded-xl p-3 space-y-2">
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={config.sourceChecked} onChange={event => configChanged('sourceChecked', event.target.checked)} />I checked that the DHL upload covers the full reporting month.</label>
          {config.sourceChecked && <label className="block text-sm">How did you check the monthly DHL data?<input className="app-input w-full mt-1" value={config.sourceReference} onChange={event => configChanged('sourceReference', event.target.value)} placeholder="For example, statement and dispatch records checked" /></label>}
          <p className="text-xs text-slate-600">Missing or incomplete DHL data must be checked before confirming a report. It is not automatically zero business.</p>
        </div>
        {unknowns.length > 0 && <div className="space-y-3"><h4 className="font-semibold text-violet-900">Review new expense columns</h4>{unknowns.map(header => {
          const value = config.mappings[header.original_header];
          const selection = !Object.hasOwn(config.mappings, header.original_header) ? '' : value === null ? 'ignore' : 'expense';
          return <div key={header.column} className="grid md:grid-cols-3 gap-2 bg-white border border-violet-100 rounded-xl p-3">
            <p className="font-medium text-sm">{header.original_header}</p>
            <label className="text-sm">Treat this column as<select className="app-select block mt-1 w-full" aria-label={`Classify ${header.original_header}`} value={selection} onChange={event => {
              const next = { ...config.mappings }; if (event.target.value === 'ignore') next[header.original_header] = null; else if (event.target.value === 'expense') next[header.original_header] = header.original_header; else delete next[header.original_header]; configChanged('mappings', next);
            }}><option value="">Choose…</option><option value="expense">An operating expense</option><option value="ignore">Ignore this column</option></select></label>
            {selection === 'expense' && <label className="text-sm">Expense category name<input className="app-input block mt-1 w-full" aria-label={`Category name for ${header.original_header}`} value={value || ''} onChange={event => configChanged('mappings', { ...config.mappings, [header.original_header]: event.target.value })} /></label>}
          </div>;
        })}</div>}
        {preview && <details className="text-sm"><summary className="cursor-pointer font-medium text-violet-800">Compare with checked manual figures (optional)</summary>
          <div className="space-y-3 mt-3"><label className="flex gap-2"><input type="checkbox" checked={config.referencesChecked} onChange={event => configChanged('referencesChecked', event.target.checked)} />I verified the meaning of the manual comparison columns.</label>
            {config.referencesChecked && <><p className="text-xs text-slate-600">NET PAID I and NET PAID 2 are intermediate figures and cannot be selected as final net payable.</p>
              <div className="grid md:grid-cols-3 gap-3">{['gross', 'operating_expenses', 'commission', 'net_payable'].map(key => <label key={key}>{FINANCIAL_LABELS[key]}<select className="app-select block mt-1 w-full" aria-label={`Manual column for ${key}`} value={config.referenceColumns[key] || ''} onChange={event => configChanged('referenceColumns', { ...config.referenceColumns, [key]: event.target.value })}><option value="">Do not compare</option>{candidates[key].map(header => <option key={header}>{header}</option>)}</select></label>)}</div>
              <label className="block">How did you verify these column meanings?<input className="app-input w-full mt-1" value={config.referenceReason} onChange={event => configChanged('referenceReason', event.target.value)} /></label>
            </>}
          </div>
        </details>}
        <label className="block text-sm font-medium">Review note for category choices or corrections<input className="app-input block mt-1 w-full" aria-label="Expense review note" value={config.reason} onChange={event => configChanged('reason', event.target.value)} placeholder="Explain what you checked or corrected" /></label>
      </fieldset>
      <div className="flex flex-wrap gap-2"><button type="button" className="app-button-primary" disabled={!!busy || (!file && !config.storedId) || !month} onClick={updatePreview}>{preview ? 'Update preview' : 'Preview expenses'}</button><button type="button" className="app-button-secondary" disabled={!!busy || !preview || dirty || (versions.length > 0 && !config.previousId)} onClick={saveDraft}>Save draft</button></div>
      {dirty && preview && <p role="status" className="text-sm text-amber-900">Your choices have changed. Update the preview to check the new figures before saving.</p>}
      {preview && !preview.ready && <p className="text-sm text-rose-700">This preview needs attention. You may save a draft, but it cannot be confirmed until the blocking issues are resolved.</p>}
    </div>}

    {!uploadOpen && report && <div className="flex flex-wrap gap-3 items-end justify-between">
      <label className="text-sm font-medium">Report version<select className="app-select block mt-1" aria-label="Monthly report version" disabled={!!busy || dialogOpen} value={report.id} onChange={event => loadReport(event.target.value)}>{report.versions.map(version => <option key={version.id} value={version.id}>Version {version.version} ({STATUS_LABELS[version.status]})</option>)}</select></label>
      <div className="flex flex-wrap gap-2"><button type="button" className="app-button-secondary" disabled={!!busy || dialogOpen} onClick={() => { newVersion(); onOpenUpload(); }}>Create corrected version</button>
        <button type="button" className="app-button-secondary" disabled={!!busy || dialogOpen} onClick={() => download('xlsx')}>Export Excel</button><button type="button" className="app-button-secondary" disabled={!!busy || dialogOpen} onClick={() => download('pdf')}>Export PDF</button>
        {report.status === 'draft' && <button type="button" className="app-button-primary" disabled={!!busy || !report.can_confirm || dialogOpen} onClick={() => { dialog.current.showModal(); setDialogOpen(true); }}>Confirm report</button>}
      </div>
    </div>}
    {display ? <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold text-violet-900">{monthLabel(display.reporting_month.slice(0, 7))}</h3><span className="app-chip">{STATUS_LABELS[display.status]}{display.version != null ? ` · Version ${display.version}` : ''}</span><span className="text-sm text-slate-600">{display.rows.length} trucks</span></div>
      {display.status === 'superseded' && <p className="text-sm text-amber-900">Historical report: this version has been superseded. Its figures are preserved as originally confirmed.</p>}
      {uploadOpen && dirty && <p className="text-sm text-amber-900">Figures below are from the last checked preview or saved version. They do not yet include your latest choices.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{['gross', 'operating_expenses', 'commission', 'net_payable'].map(key => <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-4" key={key}><p className="text-sm text-violet-800">{FINANCIAL_LABELS[key]}</p><p className={`text-lg font-semibold mt-1 ${negative(display.totals[key]?.amount) ? 'text-rose-700' : 'text-violet-950'}`}>{formatKes(display.totals[key]?.amount)}</p>{display.totals[key]?.missing_rows > 0 && <p className="text-xs text-slate-600 mt-1">{display.totals[key].missing_rows} truck(s) unresolved</p>}</div>)}</div>
      {(display.issues?.length > 0 || display.decisions?.historical_review?.out_of_month_records?.length > 0) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm space-y-1" aria-label="Workbook review warnings"><ul className="list-disc pl-5 space-y-1">{display.issues.map((issue, index) => <li key={index} className={issue.blocking ? 'text-rose-700' : 'text-amber-900'}>{issueText(issue)}</li>)}{display.decisions?.historical_review?.out_of_month_records?.length > 0 && <li>Some DHL records are dated outside the selected reporting month. Review these separately; they have not been added to this month’s revenue.</li>}</ul></div>}
      {display.rows.some(row => row.issues.some(issue => issue.blocking)) && <p className="text-sm text-rose-700">Some truck rows need attention. Select a truck registration to review its issues and expense amounts.</p>}
      <SourceDateReview report={display} editable={uploadOpen && !!preview} config={config} change={configChanged} disabled={!!busy} />
      <TruckTable report={display} editable={uploadOpen && !!preview && (!!file || !!config.storedId)} config={config} change={configChanged} disabled={!!busy} />
      <p className="text-xs text-slate-500">All figures are calculated by Smithsons. Commission is 7% of each truck’s positive balance after operating expenses. Negative balances are retained.</p>
    </div> : <p className="text-sm text-slate-600">Choose a month to view a saved report, or use Upload Expenses Excel to prepare a new report.</p>}

    <dialog ref={dialog} className="rounded-2xl border border-violet-100 p-6 shadow-xl max-w-lg w-[calc(100%-2rem)] backdrop:bg-slate-900/40" onCancel={event => { if (busy) { event.preventDefault(); return; } setDialogOpen(false); }} aria-labelledby="expense-confirm-title">
      <h3 id="expense-confirm-title" className="app-section-title">Confirm monthly report</h3>
      {report && <><p className="mt-3 text-sm">Confirm version {report.version} for {monthLabel(report.reporting_month.slice(0, 7))}?</p><p className="font-semibold mt-2">Net payable: {formatKes(report.totals.net_payable.amount)}</p><p className="text-sm mt-3">Confirm that you have reviewed the figures, warnings and any negative balances. Any previous confirmed version will be kept in history.</p></>}
      <div className="flex gap-2 mt-5"><button type="button" className="app-button-secondary" disabled={!!busy} onClick={closeDialog}>Cancel</button><button type="button" className="app-button-primary" disabled={!!busy} onClick={confirmReport}>{busy === 'confirm' ? 'Confirming…' : 'Confirm this version'}</button></div>
    </dialog>
  </section>;
}
