import React,{useEffect,useRef,useState} from 'react';
import './DhlMonthlyPayouts.css';
import {createPortal} from 'react-dom';
import axiosAuth from '../../utils/axiosAuth';
import {ROOT,currentMonth,monthDate,monthLabel,formatKes,apiError,issueText,canReviewNoActivity,revenueReviewMessage,displayedFinancial,financialStatusLabel} from './monthlyExpenseUi';

const keys=['gross','operating_expenses','commission','net_payable'];
const labels=['Total DHL gross','Total operating expenses','Total Smithsons commission','Total net payable'];
const nonzero=value=>value!=null&&/[1-9]/.test(String(value));
const ready=row=>row.truck_confirmation?.can_confirm??(row.gross!=null&&row.net_payable!=null&&!!row.vehicle_id&&!row.issues?.some(i=>i.blocking));

export default function DhlMonthlyPayouts(){
 const [month,setMonth]=useState(currentMonth),[data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [truck,setTruck]=useState(null),[ack,setAck]=useState(false),[noActivity,setNoActivity]=useState(''),[mappings,setMappings]=useState({});
 const generation=useRef(0),categoryReview=useRef(null);
 const endpoint=`${ROOT}/monthly-payouts/${monthDate(month)}`;
 useEffect(()=>{const token=++generation.current;setData(null);setTruck(null);setError('');setNotice('');
  axiosAuth.get(endpoint).then(r=>{if(token===generation.current){setData(r.data);setMappings(r.data.report?.decisions?.approved_mappings||{});}}).catch(async e=>{if(token===generation.current)setError((await apiError(e)).message);});
 },[month]);
 const report=data?.report,files=data?.files,raw=files?.raw_files?.[0],net=files?.expense_files?.[0],rows=[...(report?.rows||[]),...(files?.unmatched_trucks||[])];
 const reconciliation=files?.source_rounding_review,centReview=files?.cent_difference_review;
 const eligible=(row,current=data)=>ready(row)&&!(current?.report?.calculation_policy?.transport_policy==='source-inclusive-reconciled-v1'&&!current?.files?.source_rounding_review?.migration_ready);
 const unknownHeaders=(report?.header_mappings||[]).filter(h=>h.classification==='unknown');
 const pending=rows.filter(r=>!r.truck_confirmation?.record&&!eligible(r)).length;
 function expected(current){return {expected_report_id:current.files.latest_report_id,expected_raw_id:current.files.raw_files.find(f=>f.source_kind==='archive')?.id||null};}
 async function reload(){const next=(await axiosAuth.get(endpoint)).data;setData(next);return next;}
 async function run(operation){setBusy(true);setError('');setNotice('');try{await operation();}catch(e){try{await reload();}catch{}const info=await apiError(e);const detail=e.response?.data?.detail;setError(e.response?.status===409?(typeof detail==='string'?detail:typeof detail?.message==='string'?detail.message:info.message):info.message);}finally{setBusy(false);}}
 async function upload(kind,event){const file=event.target.files?.[0];event.target.value='';if(!file)return;
  if(!/\.xlsx$/i.test(file.name)||file.size>20_000_000){setError('Choose an XLSX file no larger than 20 MB.');return;}
  await run(async()=>{
   let current=await reload();const form=new FormData();form.append('file',file);
   if(kind==='expenses'){
    for(const [k,v] of Object.entries(expected(current)))if(v!=null)form.append(k,String(v));
    current=(await axiosAuth.post(endpoint+'/expenses',form)).data;
   }else{
    form.append('month',monthDate(month));const previous=current.files.raw_files.find(f=>f.source_kind==='archive');
    if(previous)form.append('previous_id',String(previous.id));form.append('reason',previous?'Administrator uploaded a corrected source; prior history retained':'Initial DHL workbook uploaded by administrator');
    const saved=(await axiosAuth.post(`${ROOT}/monthly-files/dhl`,form)).data;
    // Evidence attachment never replaces existing revenue. Import only a new
    // empty month through the existing guarded uploader, with strict preflight.
    const check=saved.verification,invalid=check.issues.some(i=>!['source_manifest_mismatch','inclusive_amount_mismatch','source_marked_error'].includes(i.code));
    if(current.files.parsed_dhl.records===0&&check.workbook_group_count>0&&!invalid){
     const original=new FormData();original.append('file',file);
     await axiosAuth.post(`${ROOT}/upload`,original,{params:{reporting_month:monthDate(month)}});
    }
    current=await reload();
    if(current.report)current=(await axiosAuth.post(endpoint+'/sync',expected(current))).data;
   }
   setData(current);setMappings(current.report?.decisions?.approved_mappings||{});setNotice('File saved. Calculations updated.');
  });
 }
 async function download(path,filename){const response=await axiosAuth.get(path,{responseType:'blob'});const url=URL.createObjectURL(response.data),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function pdf(rowId){const doc=(await axiosAuth.post(`${ROOT}/monthly-statement-documents/from-row/${rowId}`)).data;await download(`${ROOT}/monthly-statement-documents/${doc.id}/pdf`,`smithsons_transport_statement_${doc.id}.pdf`);}
 function review(row){setTruck(row);setAck(false);setNoActivity('');}
 function reviewExpenseColumns(){setTruck(null);requestAnimationFrame(()=>{categoryReview.current?.scrollIntoView({behavior:'smooth',block:'center'});categoryReview.current?.querySelector('select')?.focus();});}
 async function issue(){await run(async()=>{
  let current=data,row=truck;
  if(!current.report.id){current=(await axiosAuth.post(endpoint+'/sync',expected(current))).data;row=current.report.rows.find(r=>r.normalized_plate===truck.normalized_plate);setData(current);}
  if(!eligible(row,current))throw new Error('This truck needs review. Refresh its calculations.');
  const prior=row.truck_confirmation?.expected_current_confirmation_id??current.approvals.find(a=>a.normalized_plate===row.normalized_plate)?.id??null;
  await axiosAuth.post(`${ROOT}/expense-rows/${row.id}/confirm`,{reason:'Administrator reviewed this truck’s workbook sources, expenses and payout before issuing its statement.',expected_current_confirmation_id:prior});
  await pdf(row.id);setTruck(null);await reload();setNotice('Payslip ready. The confirmed statement is saved.');
 });}
 async function updateReview(){await run(async()=>{
  const options={...expected(data),mappings};
  if(noActivity.trim())options.no_activity={...(report.decisions?.verified_no_activity||{}),[truck.normalized_plate]:noActivity.trim()};
  const next=(await axiosAuth.post(endpoint+'/sync',options)).data;setData(next);if(truck)setTruck(next.report.rows.find(r=>r.normalized_plate===truck.normalized_plate));setNotice('Review saved. Calculations updated.');
 });}
 function card(kind,title,entry){return <section className="app-section space-y-3"><h2 className="app-section-title">{title}</h2>
  <p className="text-sm">{entry?'Uploaded':kind==='dhl'?'Upload DHL workbook.':'Upload expense workbook.'}</p>
  {entry&&<><p className="font-medium break-all">{entry.original_filename||'Retained workbook'}</p><button type="button" disabled={busy} className="text-violet-700 underline" onClick={()=>run(()=>download(entry.download,entry.original_filename||'original.xlsx'))}>Download {kind==='dhl'?'DHL':'expense'} workbook</button></>}
  <label className="app-button-secondary inline-block cursor-pointer">{entry?'Upload corrected file':'Upload Excel'}<input type="file" accept=".xlsx" className="hidden" aria-label={title} disabled={busy||!files?.archive_available} onChange={e=>upload(kind,e)}/></label>
  {kind==='expenses'&&report?.header_mappings?.some(h=>h.classification==='unknown')&&<p>Choose how to treat the new expense columns below to calculate payouts.</p>}

  {kind==='dhl'&&entry&&entry.verification&&!entry.verification.matches&&!reconciliation?.source_verified&&centReview?.calculated_gross==null&&<p className="text-sm text-amber-900">{entry.verification.date_issues?.some(i=>['out_of_period_date','invalid_source_date','missing_source_date'].includes(i.code))?`DHL dates are outside ${monthLabel(month)}.`:'DHL source needs review.'}</p>}
 </section>;}
 return <div className="app-page dhl-payouts space-y-6" aria-busy={busy}>
  <header className="app-page-header payout-header"><div><h1 className="app-title">DHL Monthly Payouts</h1><p className="text-sm text-slate-600">Upload two workbooks. Review truck payouts. Download payslips.</p></div>
   <label className="font-medium text-sm">Reporting month<input type="month" className="app-input block mt-1" value={month} disabled={busy} onChange={e=>e.target.value&&setMonth(e.target.value)}/></label></header>
  {error&&<div><p role="alert" className="rounded-xl bg-rose-50 text-rose-800 p-3">{error}</p><button type="button" disabled={busy} className="app-button-secondary" onClick={()=>run(reload)}>Retry loading month</button></div>}
  {notice&&<p role="status" className="rounded-xl bg-violet-50 text-violet-900 p-3">{notice}</p>}
  {!files?<p>Loading saved month…</p>:<>
   <div className="payout-files">{card('dhl','DHL Trips Summary',raw)}{card('expenses','Net Summary Expenses',net)}</div>
   {unknownHeaders.length>0&&<section ref={categoryReview} aria-label="Expense category review" className="app-section space-y-3 border-amber-300">
    <h2 className="app-section-title">Review new expense columns</h2>
    <p>Expenses and net payable are waiting for these choices. For each new column, choose Operating expense to include its amounts, or Ignore to leave it out. Nothing is deducted until you save.</p>
    {unknownHeaders.map(h=><label key={h.column} className="block text-sm">Classify {h.original_header}<select aria-label={`Classify ${h.original_header}`} className="app-select ml-2" value={Object.hasOwn(mappings,h.original_header)?mappings[h.original_header]===null?'ignore':'expense':''} onChange={e=>setMappings({...mappings,[h.original_header]:e.target.value==='ignore'?null:h.original_header})}><option value="" disabled>Choose…</option><option value="expense">Operating expense</option><option value="ignore">Ignore</option></select></label>)}
    <button type="button" className="app-button-secondary" disabled={busy||unknownHeaders.some(h=>!Object.hasOwn(mappings,h.original_header))} onClick={updateReview}>Save category choices</button>
    <p className="text-sm">Uses the saved workbooks. No need to upload again. This does not confirm trucks or issue payslips.</p>
   </section>}
   {report?.calculation_policy?.transport_policy==='source-inclusive-reconciled-v1'&&!reconciliation?.migration_ready&&<p role="alert">The source-inclusive calculation update must be installed before a new report can be saved or confirmed. Existing statements are preserved.</p>}
   <div className="payout-totals">{keys.map((key,index)=>{const total=report?.totals?.[key],amount=key==='gross'&&reconciliation?.source_verified?reconciliation.gross:key==='gross'&&centReview?.calculated_gross!=null?centReview.calculated_gross:key==='gross'&&raw?.verification?.matches?raw.verification.workbook_totals.gross:total?.amount;
    return <section key={key} className="app-section"><h2 className="text-sm text-slate-600">{labels[index]}</h2><p className="text-xl font-semibold text-violet-950">{amount!=null?formatKes(amount):'Needs review'}</p>{total?.missing_rows>0&&<p className="text-xs text-slate-600">{total.missing_rows} trucks need review. Known: {formatKes(total.known_subtotal)}</p>}</section>;
   })}</div>
   <section className="app-section space-y-3"><div className="flex justify-between"><h2 className="app-section-title">Truck payouts</h2><p className="text-sm">{pending?`${pending} trucks need attention.`:rows.length?`${rows.length} trucks`:'Upload both workbooks.'}</p></div>
    <div className="payout-table-scroll"><table className="app-table" aria-label="Truck payouts"><thead><tr>{['Truck','Owner','Gross','Expenses','Commission','Net Payable','Payslip'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
     {rows.map(row=><tr key={row.normalized_plate}><td>{row.normalized_plate}{financialStatusLabel(row)&&<p className="text-xs font-medium">{financialStatusLabel(row)}</p>}</td><td>{row.vehicle_owner_snapshot?.owner_name||'Needs matching'}</td>{keys.map(key=><td key={key}>{displayedFinancial(row,key)==null?'Needs review':formatKes(displayedFinancial(row,key))}</td>)}<td><button type="button" disabled={busy} className="app-button-secondary" onClick={()=>review(row)} aria-label={`Review ${row.normalized_plate}`}>{row.truck_confirmation?.record||eligible(row)?'View payslip':'Resolve issue'}</button></td></tr>)}
    </tbody></table></div>
   </section>
   <details className="app-section"><summary>Source diagnostics</summary><div className="space-y-3 mt-4">
    {(report?.issues||[]).filter(i=>i.blocking).map((i,n)=><p key={'report'+n}>{issueText(i)}</p>)}
    {(raw?.verification?.issues||[]).map((i,n)=><p key={'source'+n}>{i.message}</p>)}
   </div></details>
  </>}
  {truck&&createPortal(<div className="dhl-payout-dialog-overlay"><section role="dialog" aria-modal="true" aria-label={`Review ${truck.normalized_plate}`} className="dhl-payout-dialog" onKeyDown={e=>{if(e.key==='Escape'&&!busy)setTruck(null);}}>
   <h2 className="text-xl font-semibold">{truck.normalized_plate} · {monthLabel(month)}</h2><p>{truck.vehicle_owner_snapshot?.owner_name||'Owner needs matching'}</p>
   {unknownHeaders.length>0&&<div className="rounded-xl bg-amber-50 p-3 space-y-2"><p>Expense totals are waiting for classification of: {unknownHeaders.map(h=>h.original_header).join(', ')}.</p><button type="button" disabled={busy} className="app-button-secondary" onClick={reviewExpenseColumns}>Review expense columns</button></div>}
   {financialStatusLabel(truck)&&<p className="font-medium">{financialStatusLabel(truck)}</p>}
   {truck.provisional_financial&&<p className="text-amber-900">Provisional source-inclusive figures — not approved for payout. Resolve the source checks before confirmation.</p>}
   <h3>Revenue</h3>
   <dl>{truck.revenue_breakdown&&<>{[['distribution','DIST'],['offloading','Offloading'],['surcharge','Surcharge']].map(([key,label])=>truck.revenue_breakdown[key]!=null&&<div key={key}><dt>{label}</dt><dd>{formatKes(truck.revenue_breakdown[key])}</dd></div>)}
    {nonzero(truck.revenue_breakdown.rounding_difference)&&<div><dt>Source rounding reconciliation</dt><dd>{formatKes(truck.revenue_breakdown.rounding_difference)}</dd></div>}</>}
    <div><dt>Gross</dt><dd>{displayedFinancial(truck,'gross')==null?'Needs review':formatKes(displayedFinancial(truck,'gross'))}</dd></div></dl>
   <h3>Deductions</h3>
   <dl>{displayedFinancial(truck,'dhl_admin_fee')!=null&&<div><dt>DHL administration fee (5% of DIST including surcharge)</dt><dd>{formatKes(displayedFinancial(truck,'dhl_admin_fee'))}</dd></div>}
    {Object.entries(truck.deductions||{}).filter(([,v])=>nonzero(v.amount)).map(([k,v])=><div key={k}><dt>{v.original_header||v.label}</dt><dd>{formatKes(v.amount)}</dd></div>)}
    {['operating_expenses','commission'].map((key,i)=><div key={key}><dt>{['Total expenses','Smithsons commission (7%)'][i]}</dt><dd>{displayedFinancial(truck,key)==null?'Needs review':formatKes(displayedFinancial(truck,key))}</dd></div>)}</dl>
   <dl className="payout-final"><div><dt>Net payable</dt><dd>{displayedFinancial(truck,'net_payable')==null?'Needs review':formatKes(displayedFinancial(truck,'net_payable'))}</dd></div></dl>
   {String(truck.net_payable).startsWith('-')&&<p className="text-amber-900">Expenses exceed gross. Negative balance retained.</p>}
   {truck.gross==null&&<p className="text-amber-900">{revenueReviewMessage(truck)}</p>}
   {(truck.issues||[]).filter(i=>i.blocking&&(i.code!=='preview_unresolved'||!unknownHeaders.length)).map((i,n)=><p className="text-sm text-amber-900" key={n}>{issueText(i,truck)}</p>)}
   {truck.gross==null&&canReviewNoActivity(truck)&&report&&report.rows.some(r=>r.normalized_plate===truck.normalized_plate)&&<label className="block text-sm">If you verified no monthly business, record the evidence<input aria-label="No activity evidence" value={noActivity} onChange={e=>setNoActivity(e.target.value)} className="app-input w-full mt-1"/><button type="button" disabled={busy||!noActivity.trim()} className="app-button-secondary mt-2" onClick={updateReview}>Save no-activity review</button></label>}
   {!truck.truck_confirmation?.record&&eligible(truck)&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I reviewed this truck’s workbook amounts and approve this statement.</label>}
   <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="app-button-secondary" onClick={()=>setTruck(null)}>Close</button>
    {truck.truck_confirmation?.record?<button type="button" disabled={busy} className="app-button-primary" onClick={()=>run(()=>pdf(truck.id))}>Download payslip</button>:<button type="button" disabled={busy||!ack||!eligible(truck)} className="app-button-primary" onClick={issue}>Confirm and issue payslip</button>}

   </div>
  </section></div>,document.body)}
 </div>;
}
