import React, { useState } from 'react';
import './DhlReconciliationDetails.css';
import { formatKes } from './monthlyExpenseUi';

const LABELS = {
  matched: 'Matched', dhl_only: 'DHL only', internal_only: 'Smithsons only',
  ambiguous_internal_reference: 'Ambiguous order reference', missing_reference: 'Reference missing',
  reference_multiple_trucks_or_dates: 'Reference spans trucks or dates', plate_mismatch: 'Truck mismatch',
  ambiguous_internal_trips: 'Multiple internal trips', missing_trip: 'Internal trip missing',
  missing_internal_revenue: 'Internal revenue missing', transport_revenue_difference: 'Transport amount differs',
  date_mismatch: 'Dates differ', trip_not_completed: 'Trip not completed',
  workbook_only: 'Workbook only', workbook_not_available: 'Workbook not saved',
  ambiguous_workbook_plate: 'Duplicate workbook truck', ambiguous_vehicle_plate: 'Ambiguous vehicle match',
  unassigned_dhl_revenue: 'Unassigned revenue', revenue_not_verified_zero: 'No revenue; zero not verified',
  live_revenue_differs_from_snapshot: 'Live revenue differs from confirmed snapshot', invalid_dhl_amount: 'Invalid source amount',
};
const statusText = row => row.status.map(code => LABELS[code] || code.replaceAll('_', ' ')).join('; ');
const matches = (row, filter) => filter === 'all' || (filter === 'matched' ? row.matched : !row.matched);

function Filter({ label, value, onChange }) {
  return <label className="text-sm text-violet-800">Show <select aria-label={label} className="app-input ml-2" value={value} onChange={e => onChange(e.target.value)}>
    <option value="all">All records</option><option value="matched">Matched</option><option value="unmatched">Needs review</option>
  </select></label>;
}

export default function DhlReconciliationDetails({ details }) {
  const [orderFilter, setOrderFilter] = useState('all');
  const [truckFilter, setTruckFilter] = useState('all');
  if (!details) return <p className="app-card p-4 text-sm">Detailed reference and workbook comparisons are unavailable from this backend version. The existing vehicle comparison remains below.</p>;
  return <div className="dhl-reconciliation-details">
    <section className="app-card p-4 space-y-3">
      <h2 className="app-section-title">Revenue control totals</h2>
      <div className="flex flex-wrap gap-6 text-sm">
        <p>By reference: <strong>{formatKes(details.totals.dhl_gross_by_reference)}</strong></p>
        <p>By truck: <strong>{formatKes(details.totals.dhl_gross_by_truck)}</strong></p>
        <p>Difference: <strong>{formatKes(details.totals.difference)}</strong></p>
        <p>On payout roster: <strong>{formatKes(details.totals.payout_roster_dhl_gross)}</strong></p>
        <p>Outside payout roster: <strong>{formatKes(details.totals.outside_payout_roster_gross)}</strong></p>
        <p>Ambiguous roster: <strong>{formatKes(details.totals.ambiguous_roster_gross)}</strong></p>
        <p>Unassigned: <strong>{formatKes(details.totals.unassigned_dhl_gross)}</strong></p>
      </div>
      <p className="text-sm text-slate-600">Investigation only. These findings do not change orders, trips, financial snapshots or payslip permissions. Admin charges are audit-only.</p>
      {details.warnings.map((warning, i) => <p key={i} className="text-sm text-amber-900">{warning}</p>)}
      {!!details.zero_transport_audit_rows?.length && <details><summary className="text-sm font-semibold cursor-pointer">Zero-transport / Admin audit records ({details.zero_transport_audit_rows.length})</summary><ul className="list-disc pl-5 text-sm">{details.zero_transport_audit_rows.map((row, i) => <li key={i}>{row.truck}, reference {row.reference}, {row.date}: {row.reason}</li>)}</ul></details>}
    </section>
    <section className="app-card p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="app-section-title">Order Reconciliation</h2><Filter label="Order reconciliation filter" value={orderFilter} onChange={setOrderFilter} /></div>
      <p className="text-sm text-slate-600">REF NO matches the Smithsons order number. The transport comparison uses internal trip revenue against DIST; Offloading is shown separately and included in gross. Investigate manual trip-revenue overrides before treating amounts as equivalent.</p>
      <div className="overflow-x-auto"><table className="app-table min-w-[1100px]" aria-label="Order reconciliation details">
        <thead><tr>{['DHL REF NO', 'Smithsons order number', 'Truck: DHL / Internal', 'DHL gross', 'DHL DIST', 'Offloading', 'Internal transport', 'Internal minus DIST', 'Dates: DHL / Order', 'Trip status', 'Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{details.order_rows.filter(row => matches(row, orderFilter)).map((row, i) => <tr key={`${row.reference}-${i}`}>
          <td>{row.reference || 'Missing'}</td><td>{row.order_numbers.join(', ') || 'No order'}</td>
          <td>{row.dhl_plates.join(', ') || '-'} / {row.internal_plates.join(', ') || '-'}</td>
          {[row.dhl_gross, row.dhl_distribution, row.dhl_offloading, row.internal_amount, row.difference].map((value, n) => <td key={n} className="whitespace-nowrap">{formatKes(value)}</td>)}
          <td>{row.dhl_dates.join(', ')} / {row.internal_dates.join(', ')}</td><td>{row.trip_statuses.join(', ') || '-'}</td>
          <td className={row.matched ? 'text-emerald-700' : 'text-amber-900'}>{statusText(row)}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <section className="app-card p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="app-section-title">Truck Financial Reconciliation</h2><Filter label="Truck reconciliation filter" value={truckFilter} onChange={setTruckFilter} /></div>
      <p className="text-sm text-slate-600">{details.source.financial_report_id ? `Expense workbook version ${details.source.financial_version} (${details.source.financial_status}).` : 'No saved monthly expense workbook selected.'} Workbook figures are stored snapshots; live DHL gross is shown separately. Blank expenses are audited zero.</p>
      <p className="text-sm text-amber-900">{details.source.truck_confirmation_available ? 'Verified trucks can be confirmed independently in DHL Payout Reports. Existing confirmed versions remain available while other trucks are reviewed.' : 'Save and review a monthly expense workbook to see truck confirmation eligibility. Existing confirmed statements remain available despite unrelated operational findings.'}</p>
      <div className="overflow-x-auto"><table className="app-table min-w-[1050px]" aria-label="Truck financial reconciliation details">
        <thead><tr>{['Truck', 'DHL references', 'Live DHL gross', 'Snapshot gross', 'Workbook expenses', 'Commission', 'Net payable', 'Status', 'Payslip eligibility'].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{details.truck_rows.filter(row => matches(row, truckFilter)).map(row => <tr key={row.plate_number}>
          <td>{row.plate_number}</td><td>{row.dhl_reference_count}</td>
          {[row.dhl_gross, row.snapshot_gross, row.operating_expenses, row.commission, row.net_payable].map((value, n) => <td key={n} className="whitespace-nowrap">{formatKes(value)}</td>)}
          <td className={row.matched ? 'text-emerald-700' : 'text-amber-900'}>{statusText(row)}</td><td>{row.payslip_eligibility}</td>
        </tr>)}</tbody>
      </table></div>
      {!!details.historical_source_rows?.length && <details><summary className="text-sm font-semibold cursor-pointer">Historical source date issues ({details.historical_source_rows.length})</summary><ul className="list-disc pl-5 text-sm">{details.historical_source_rows.map((row, i) => <li key={i}>Row {row.source_row}: {row.date}, {row.truck}, reference {row.reference}, {formatKes(row.amount)}. Separate review required.</li>)}</ul></details>}
    </section>
  </div>;
}
