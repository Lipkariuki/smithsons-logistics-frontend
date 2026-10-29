import React, {useEffect, useState} from 'react';
import axiosAuth from '../../utils/axiosAuth';
import {ROOT,monthDate,formatKes,apiError} from './monthlyExpenseUi';

export default function SavedMonthlyFiles({month,onViewReport,onExpenseUpload,onArchive,onChanged,onBusyChange,refreshKey=0}) {
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
 useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
 useEffect(()=>{let active=true;setData(null);setError('');if(!month)return;
  axiosAuth.get(`${ROOT}/monthly-files`,{params:{month:monthDate(month)}}).then(({data:next})=>{if(active){setData(next);onArchive?.(next.raw_files.find(f=>f.source_kind==='archive')?.id||null);}}).catch(async e=>{const info=await apiError(e);if(active)setError(info.message);});
  return()=>{active=false;};
 },[month,refresh,refreshKey]);
 async function download(entry) {
  setBusy(true);setError('');
  try {const response=await axiosAuth.get(entry.download,{responseType:'blob'});const url=URL.createObjectURL(response.data),a=document.createElement('a');a.href=url;a.download=entry.original_filename||'original_trips_workbook.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  catch(e){setError((await apiError(e)).message);}finally{setBusy(false);}
 }
 async function rawUpload(event) {
  const file=event.target.files?.[0];event.target.value='';if(!file||!data)return;
  setError('');if(!/\.xlsx$/i.test(file.name)||file.size>20_000_000){setError('Choose an XLSX workbook no larger than 20 MB.');return;}
  const previous=data.raw_files.find(f=>f.source_kind==='archive');let reason='';
  if(data.raw_files.length){reason=window.prompt('Why are you replacing the saved DHL workbook? Earlier versions and confirmed statements will be preserved.')||'';if(!reason.trim())return;}
  setBusy(true);
  try {
   const form=new FormData();form.append('file',file);
   if(data.parsed_dhl.records>0){form.append('month',monthDate(month));if(previous)form.append('previous_id',String(previous.id));form.append('reason',reason);await axiosAuth.post(`${ROOT}/monthly-files/dhl`,form);}
   else {form.append('source_reason',reason);await axiosAuth.post(`${ROOT}/upload`,form,{params:{reporting_month:monthDate(month),source_previous_id:previous?.id}});}
   setRefresh(v=>v+1);onChanged?.();
  }catch(e){setError((await apiError(e)).message);}finally{setBusy(false);}
 }
 async function verifyEvidence(entry){
  setBusy(true);setError('');
  try{const {data:check}=await axiosAuth.get(`${ROOT}/monthly-files/raw/${entry.id}/verification`);setData(current=>({...current,raw_files:current.raw_files.map(f=>f.id===entry.id&&f.source_kind==='archive'?{...f,verification:check}:f)}));}
  catch(e){setError((await apiError(e)).message);}finally{setBusy(false);}
 }
 function evidence(check){return check&&<div className="rounded border border-violet-100 p-2 space-y-1" aria-label="DHL evidence comparison">
  <p className="font-medium">{check.matches?'Evidence matches saved DHL records — administrator review required':'Evidence needs review — not verified'}</p>
  <p>Workbook gross for selected month: {formatKes(check.workbook_totals?.gross)} · Saved DHL gross: {formatKes(check.saved_totals?.gross)}</p>
  <p className="text-xs">Compared by transaction date, reference, normalized truck plate, DIST and Offloading separately. Admin is audit-only. No revenue or payslips were replaced.</p>
  {check.date_issues?.map(r=><p key={`date-${r.source_row}`} className="text-amber-900">Excel row {r.source_row}: {r.date||'Missing date'} · {r.truck} · Ref {r.reference} · Amount {r.amount} — {r.reason}</p>)}
  {check.differences?.map((r,i)=><p key={`difference-${i}`} className="text-amber-900">{r.date} · {r.truck} · Ref {r.reference}: {r.reason.replaceAll('_',' ')}. Workbook DIST / Offloading: {r.workbook?`${r.workbook.distribution} / ${r.workbook.offloading}`:'not present'}; saved: {r.saved?`${r.saved.distribution} / ${r.saved.offloading}`:'not present'}.</p>)}
  {check.issues?.filter(i=>i.code!=='source_manifest_mismatch'&&!check.date_issues?.length).map((i,n)=><p key={n} className="text-amber-900">{i.message}</p>)}
 </div>;}
 async function replaceRevenue(entry){
  if(!window.confirm('Replace imported DHL revenue using this saved workbook? Manual payslip conflicts will be blocked. Existing confirmed statements stay unchanged; draft reports must be reviewed in a new version.'))return;
  setBusy(true);setError('');
  try{const {data:blob}=await axiosAuth.get(entry.download,{responseType:'blob'});const form=new FormData();form.append('file',new File([blob],entry.original_filename||'raw.xlsx',{type:blob.type}));await axiosAuth.post(`${ROOT}/upload`,form,{params:{reporting_month:monthDate(month)}});setRefresh(v=>v+1);onChanged?.();}
  catch(e){setError((await apiError(e)).message);}finally{setBusy(false);}
 }
 const raw=data?.raw_files||[],net=data?.expense_files||[];
 const stamp=v=>v?new Date(v).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'}):'Not recorded';
 function entries(items,kind){return items.length?<details open><summary className="cursor-pointer text-sm font-medium">{items.length} saved {items.length===1?'version':'versions'}</summary><ul className="space-y-3 mt-2">{items.map((f,index)=><li key={`${f.source_kind||kind}-${f.id}`} className="border-t border-violet-100 pt-2 text-sm">
  <p className="font-medium break-all">{f.original_filename||'Raw workbook retained with an expense report; original filename not recorded'}</p>
  <p>{kind==='net'?`Report version ${f.version} · ${f.status}`:`Source version ${f.version??'not recorded'} · ${f.status==='uploaded'?'Uploaded':'Needs review'}`}</p>
  <p>Uploaded: {stamp(f.uploaded_at)}{f.uploaded_at?' EAT':''} · By: {f.uploader_name||(f.uploaded_by?`Administrator #${f.uploaded_by}`:'Not recorded')}</p>
  <button type="button" className="underline font-medium text-violet-700" disabled={busy} onClick={()=>download(f)}>Download original {kind==='net'?'expense':'DHL'} file{f.version?` v${f.version}`:''}</button>
  {kind==='raw'&&f.source_kind==='archive'&&<><button type="button" className="ml-3 underline text-violet-700" disabled={busy} onClick={()=>verifyEvidence(f)}>Verify evidence against saved records</button>{evidence(f.verification)}</>}
  {kind==='net'&&<button type="button" className="ml-3 underline text-violet-700" disabled={busy} onClick={()=>onViewReport(f.id)}>View report version {f.version}</button>}
  {kind==='raw'&&index===0&&f.source_kind==='archive'&&f.issues?.some(i=>i.code==='source_manifest_mismatch')&&<button type="button" className="block mt-2 underline text-violet-700" disabled={busy} onClick={()=>replaceRevenue(f)}>Replace existing DHL records from this file (historical payslip protection applies)</button>}
 </li>)}</ul></details>:<p className="text-sm text-amber-900">Original workbook is missing.</p>;}
 return <section className="rounded-xl border border-violet-200 p-4 space-y-3" aria-label="Saved Monthly Files" aria-busy={busy}>
  <h3 className="font-semibold text-violet-900">Saved Monthly Files</h3>
  {error&&<p className="text-sm text-amber-900">{error}</p>}
  {!data&&!error&&<p className="text-sm">Loading saved files…</p>}
  {data&&<><div className="grid md:grid-cols-2 gap-4">
   <div className="space-y-2"><h4 className="font-medium">DHL Trips Summary: {raw.length?(raw[0].status==='uploaded'?'Uploaded':'Needs Review'):'Missing'}</h4>{entries(raw,'raw')}
    {data.archive_available?<label className="app-button-secondary inline-block cursor-pointer">{raw.length?'Attach corrected evidence workbook (new source version)':data.parsed_dhl.records>0?'Attach original workbook to verify existing DHL records':'Upload new DHL month'}<input type="file" accept=".xlsx" aria-label="Saved DHL Trips Summary" className="hidden" disabled={busy} onChange={rawUpload}/></label>:<p className="text-sm text-amber-900">Raw file storage requires migration 005. Existing reports remain available.</p>}
    {data.parsed_dhl.records>0&&<p className="text-sm">{data.parsed_dhl.records} saved DHL records · Gross transport revenue {formatKes(data.parsed_dhl.gross)}. {data.source_verified?'Source review is recorded in the saved report.':'Revenue is present; source completeness is not yet verified.'}</p>}
    {data.parsed_dhl.records>0&&!raw.length&&<p className="text-sm text-amber-900">Attach the original workbook for verification. This preserves every saved DHL record and historical payslip; it does not use the replacement upload.</p>}
   </div>
   <div className="space-y-2"><h4 className="font-medium">Net Summary: {net.length?(net[0].review_status==='needs_review'?'Needs Review':'Uploaded'):'Missing'}</h4>{entries(net,'net')}
    <button type="button" className="app-button-secondary" disabled={busy} onClick={onExpenseUpload}>{net.length?'Review verification / reuse saved expenses':'Upload Net Summary'}</button>
    {net.length>0&&<p className="text-sm">The saved expense workbook can be reused. A replacement or correction creates a new report version.</p>}
   </div></div>
   <p className="text-sm text-slate-700">Upload new DHL month imports revenue only when no records exist. Attach original workbook checks existing records without changing them. Replace existing DHL records is a separate guarded action; it can be blocked by historical manual payslips.</p>
   {raw.length>0&&net.length>0&&!data.source_verified&&<p className="text-sm text-violet-900">To calculate payouts, choose “Review verification / reuse saved expenses”, check the full-month source and enter a review note, then update the preview and save a new draft. You do not need to upload either file again.</p>}
   <p className="text-xs text-slate-600">Files are private. Uploading does not confirm financial figures. Review source dates, select a truck in the report below, and confirm it only when verified.</p>
  </>}
 </section>;
}
