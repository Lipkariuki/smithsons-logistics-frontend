// Browser acceptance tests against the real app with all API requests intercepted.
// No production API calls or financial workbook reads occur.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(runtime.startsWith('/') ? pathToFileURL(runtime).href : runtime);
const base = process.env.FRONTEND_TEST_URL || 'http://127.0.0.1:8067';
if (!['127.0.0.1','localhost'].includes(new URL(base).hostname)) throw new Error('Browser tests require a local frontend');
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true }); });
after(async () => { await browser?.close(); });

const header = (column, original_header, classification='expense', category=null) => ({ column, original_header, normalized_header:original_header.toLowerCase(), classification, category, approval_source:'built_in' });
const problem = (code, message='', cell=null, blocking=true) => ({code,message,cell,blocking});
function snapshot(options={}, { id, version=null, status='preview', versions=[] }={}) {
  const mapped = Object.hasOwn(options.approved_mappings || {},'TYRES');
  const duplicate = options.approved_mappings?.TYRES === 'Fuel';
  const tyres = mapped && options.approved_mappings.TYRES !== null;
  const corrected = options.corrections?.D17 === '0.00';
  const verified = !!options.source_verification;
  const zero = !!options.verified_no_activity?.KCE726U;
  const ready = mapped && !duplicate && corrected && verified && zero && !(options.historical_review?.date_issues || []).some(row => !options.date_dispositions?.[String(row.source_row)]?.reason);
  const headers=[header(1,'TRUCK REG/NO','truck'),header(2,'FUEL','expense','fuel'),header(3,'BREAKAGES','expense','breakages'),header(4,'TELEMATICS & VSS','expense','telematics_vss'),header(5,'GPRS','expense','gprs'),header(6,'SHUNTING','expense','shunting'),header(7,'TYRES',mapped ? options.approved_mappings.TYRES === null ? 'ignored':'expense':'unknown',mapped ? 'tyres':null),header(8,'GROSS AMOUNT','ignored'),header(9,'7% COMMISSION','ignored'),header(10,'NET PAID','ignored'),header(11,'NET PAID I','ignored'),header(12,'NET PAID 2','ignored')];
  if(mapped) headers[6].approval_source='administrator';
  const makeRow=(plate, source_row, missing=false)=> {
    const row={source_worksheet:'Sheet1',source_row,normalized_plate:plate,original_plate:plate,vehicle_id:missing?2:1,vehicle_owner_snapshot:{owner_name:'Sample Partner',owner_id:7},dhl_source_snapshot:missing?[]:[{id:1,total_revenue:'1000.00'}],revenue_status:missing ? zero?'verified_no_activity':'missing':'dhl_records',issues:[],deductions:{},comparisons:{}};
    for(const [key,label,amount,column] of [['fuel','Fuel',missing?'50.00':'100.00','B'],['breakages','Breakages',missing?'0.00':'20.00','C'],['telematics_vss','Telematics & VSS',missing&&!corrected?null:missing?'0.00':'30.00','D'],['gprs','GPRS','0.00','E'],['shunting','Shunting',missing?'0.00':'50.00','F']]) row.deductions[key]={amount,label,source_cell:`${column}${source_row}`,resolution:'source'};
    if(tyres) row.deductions.tyres={amount:missing?'0.00':'100.00',label:options.approved_mappings.TYRES,source_cell:`G${source_row}`,resolution:'source'};
    row.deductions.kasarani_ksm_fuel={amount:'0.00',label:'Kasarani & KSM Fuel',source_cell:null,resolution:'absent_optional_category'};
    if(missing&&!corrected) row.issues.push(problem('blank_expense','','D17'));
    if(missing&&!zero) row.issues.push(problem('revenue_unverified'),problem('dhl_missing','',null,false));
    if(!verified) row.issues.push(problem('dhl_incomplete'));
    if(missing&&zero) row.issues.push(problem('zero_revenue','',null,false),problem('negative_net_balance_review','',null,false));
    Object.assign(row,missing?{gross:verified&&zero?'0.00':null,operating_expenses:corrected?'50.00':null,commission_base:ready?'-50.00':null,commission:ready?'0.00':null,net_payable:ready?'-50.00':null}:{gross:verified?'1000.00':null,operating_expenses:tyres?'300.00':'200.00',commission_base:ready?'700.00':null,commission:ready?'49.00':null,net_payable:ready?'651.00':null});
    for(const key of ['gross','commission','net_payable']) row.comparisons[key]={status:'unverified_reference',manual:null,difference:null};
    if(options.reference_columns?.net_payable==='NET PAID') row.comparisons.net_payable={status:missing?'material_difference':'rounding_difference',manual:missing?'-45.00':'651.01',difference:missing?'-5.00':'-0.01'};
    return row;
  };
  const issues=[problem('optional_category_absent','',null,false)];
  if(!mapped)issues.push(problem('unknown_column','Choose a category','G2'));
  if(duplicate)issues.push(problem('duplicate_category'));
  const totals=Object.fromEntries(Object.entries({gross:'1000.00',operating_expenses:'350.00',commission_base:'650.00',commission:'49.00',net_payable:'601.00'}).map(([key,value])=>[key,{amount:ready?value:null,known_subtotal:ready?value:'0.00',missing_rows:ready?0:1}]));
  return {id,version,status,file_sha256:'a'.repeat(64),reporting_month:'2026-02-01',original_filename:'expense.xlsx',header_mappings:headers,issues,assumptions:[{code:'optional_category_absent',amount:'0.00'}],decisions:{...options},rows:[makeRow('KAA123B',3),makeRow('KCE726U',17,true)],totals,full_report_totals:totals,ready,can_confirm:ready&&status==='draft',versions};
}
const readyOptions={approved_mappings:{TYRES:'Tyres'},corrections:{D17:'0.00'},source_verification:'Statement checked',reason:'Checked categories and amounts',verified_no_activity:{KCE726U:'Dispatch checked'}};

async function setup({seed=false}={}) {
  const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
  const payload=Buffer.from(JSON.stringify({role:'admin',sub:'7',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  await context.addInitScript(token=>{localStorage.setItem('token',token);},`test.${payload}.fixture`);
  const state={records:[],requests:[],fail:null,delay:0,errors:[]};
  function history(){return state.records.map(r=>({id:r.id,version:r.version,status:r.status}));}
  function decorate(record){return {...structuredClone(record),versions:history(),can_confirm:record.ready&&record.status==='draft'};}
  if(seed)state.records.push(snapshot(readyOptions,{id:1,version:1,status:'confirmed'}));
  await context.route('**/*',async route=> {
    const request=route.request();const url=new URL(request.url());const pathname=url.pathname;
    const isApi=pathname.startsWith('/dhl-reports/')||pathname.startsWith('/users/')||pathname==='/vehicles/';
    if(!isApi){if(['localhost','127.0.0.1'].includes(url.hostname))return route.continue();return route.abort();}
    state.requests.push({path:pathname,method:request.method(),headers:request.headers(),body:request.postData()});
    const respond=(status,data)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
    if(state.fail?.path===pathname){const error=state.fail;state.fail=null;return respond(error.status,error.data);}
    if(pathname==='/users/me')return respond(200,{id:7,role:'admin',name:'Sample Admin'});
    if(pathname==='/users/')return respond(200,[{id:7,name:'Sample Partner'}]);
    if(pathname==='/vehicles/')return respond(200,[{id:1,plate_number:'KAA123B',owner_id:7}]);
    if(pathname==='/dhl-reports/summary')return respond(200,[{vehicle_id:1,plate_number:'KAA123B',owner_name:'Sample Partner',order_count:2,distribution_cost:900,offloading_cost:100,total_revenue:1000,total_expenses:200,net_pay:730}]);
    if(pathname==='/dhl-reports/upload')return respond(200,{inserted:2,unmatched_vehicles:0});
    if(pathname==='/dhl-reports/payslips'&&request.method()==='GET')return respond(200,[]);
    if(pathname==='/dhl-reports/payslips'&&request.method()==='POST')return respond(200,{id:99,total_revenue:1000,commission_amount:70,net_pay:730,commission_rate:0.07,expenses:[]});
    if(pathname==='/dhl-reports/reconciliation')return respond(200,{internal_order_count:2,dhl_order_count:2,order_count_difference:0,internal_revenue:1000,dhl_revenue:1000,revenue_difference:0,matched_vehicle_count:1,mismatched_vehicle_count:0,rows:[]});
    if(pathname==='/dhl-reports/expense-imports/preview'||pathname==='/dhl-reports/expense-imports'){
      const raw=request.postData()||'';
      const options=JSON.parse(raw.match(/name="options"\r\n\r\n([\s\S]*?)\r\n--/)?.[1]||'{}');
      if(pathname.endsWith('/preview'))return respond(200,snapshot(options,{versions:history()}));
      if(state.records.length&&!options.previous_version_id)return respond(409,{detail:{code:'duplicate_import',existing_import_id:state.records[0].id}});
      const record=snapshot(options,{id:state.records.length+1,version:state.records.length+1,status:'draft'});state.records.push(record);return respond(201,decorate(record));
    }
    if(pathname==='/dhl-reports/monthly-net-summary'){
      const version=url.searchParams.get('version');const record=state.records.find(r=>version?String(r.version)===version:r.status==='confirmed');
      return record?respond(200,decorate(record)):respond(404,{detail:'Not found'});
    }
    const match=pathname.match(/^\/dhl-reports\/expense-imports\/(\d+)(?:\/(confirm|export|revise))?$/);
    if(match){const record=state.records.find(r=>r.id===Number(match[1]));if(!record)return respond(404,{detail:'Not found'});
      if(match[2]==='revise'){
        const raw=request.postData()||'';
        const options=JSON.parse(raw.match(/name="options"\r\n\r\n([\s\S]*?)\r\n--/)?.[1]||'{}');
        const preview=/name="mode"\r\n\r\npreview\r\n/.test(raw);
        const next=snapshot({...options,historical_review:record.decisions.historical_review},{id:preview?undefined:state.records.length+1,version:preview?null:state.records.length+1,status:preview?'preview':'draft',versions:history()});
        if(!preview)state.records.push(next);return respond(200,preview?next:decorate(next));
      }
      if(match[2]==='confirm'){if(!record.ready)return respond(422,{detail:{message:'Unresolved validation'}});for(const older of state.records)if(older.status==='confirmed')older.status='superseded';record.status='confirmed';return respond(200,decorate(record));}
      if(match[2]==='export'){const format=url.searchParams.get('format');return route.fulfill({status:200,contentType:format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers:{'Content-Disposition':`attachment; filename="smithsons_monthly_transport_2026-02_v${record.version}.${format}"`},body:format==='pdf'?'%PDF-1.4 synthetic test':'synthetic excel download'});}
      return respond(200,decorate(record));
    }
    return respond(404,{detail:'Unexpected API request in isolated test'});
  });
  const page=await context.newPage();page.on('pageerror',error=>state.errors.push(error.message));
  await page.goto(`${base}/admin/reports/dhl`);
  const panel=page.locator('#monthly-expense-reports');await panel.waitFor();
  await panel.getByLabel('Expense reporting month').fill('2026-02');
  return {context,page,panel,state};
}
async function openUpload(test) {
  await test.page.getByRole('button',{name:'Upload Expenses Excel',exact:true}).click();
  await test.panel.getByLabel('Expense workbook', {exact:true}).setInputFiles({name:'expense.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('synthetic workbook')});
}
async function completePreview(test,{comparison=false}={}) {
  await openUpload(test);
  await test.panel.getByLabel('I checked that the DHL upload covers the full reporting month.').check();
  await test.panel.getByLabel('How did you check the monthly DHL data?').fill('February statement and dispatch register checked');
  await test.panel.getByRole('button',{name:'Preview expenses',exact:true}).click();
  await test.panel.getByLabel('Classify TYRES').waitFor();
  await test.panel.getByLabel('Classify TYRES').selectOption('expense');
  await test.panel.getByLabel('Category name for TYRES').fill('Tyres');
  await test.panel.getByLabel('Expense review note').fill('Checked Tyres and confirmed missing telematics as zero');
  await test.panel.getByRole('button',{name:'Details for KCE726U'}).click();
  await test.panel.getByRole('button',{name:'Confirm zero for Telematics & VSS'}).click();
  assert.equal(await test.panel.getByRole('button',{name:'Save draft',exact:true}).isEnabled(),false);
  await test.panel.getByLabel('I verified that KCE726U had no business this month.').check();
  await test.panel.getByLabel('How did you verify no business?').fill('Dispatch register checked with the fleet manager');
  if(comparison){
    await test.panel.getByText('Compare with checked manual figures (optional)',{exact:true}).click();
    await test.panel.getByLabel('I verified the meaning of the manual comparison columns.').check();
    const options=await test.panel.getByLabel('Manual column for net_payable').locator('option').allTextContents();
    assert.equal(options.includes('NET PAID I'),false);assert.equal(options.includes('NET PAID 2'),false);
    await test.panel.getByLabel('Manual column for net_payable').selectOption('NET PAID');
    await test.panel.getByLabel('How did you verify these column meanings?').fill('Final NET PAID column checked with accounts');
  }
  await test.panel.getByRole('button',{name:'Update preview',exact:true}).click();
  await test.panel.getByRole('button',{name:'Save draft',exact:true}).waitFor();
  await test.page.waitForFunction(()=>!document.querySelector('#monthly-expense-reports button')?.disabled);
}

test('upload, warnings, mapping, zero confirmation, manual comparison, save/confirm, summary and exports',async()=>{
  const t=await setup();try{
    await completePreview(t,{comparison:true});
    await t.page.waitForTimeout(150);
    assert.equal(await t.panel.getByRole('button',{name:'Save draft',exact:true}).isEnabled(),true);
    assert.match(await t.panel.innerText(),/Kasarani fuel column was not included. KES 0.00 assumed./);
    assert.match(await t.panel.innerText(),/KES -50.00/);
    await t.panel.getByRole('button',{name:'Details for KAA123B'}).click();
    assert.match(await t.panel.innerText(),/Rounding-sized difference/);
    assert.match(await t.panel.innerText(),/KES -0.01/);
    if(process.env.FRONTEND_SCREENSHOT_DIR){await mkdir(process.env.FRONTEND_SCREENSHOT_DIR,{recursive:true});await t.panel.screenshot({path:path.join(process.env.FRONTEND_SCREENSHOT_DIR,'monthly-expenses-preview.png')});}
    await t.panel.getByRole('button',{name:'Save draft',exact:true}).click();
    await t.panel.getByText('Draft version 1 saved. Review it before confirming.',{exact:true}).waitFor();
    assert.equal(t.state.records[0].decisions.corrections.D17,'0.00');
    assert.equal(Object.hasOwn(t.state.records[0].decisions,'net_payable'),false);
    await t.panel.getByRole('button',{name:'Confirm report',exact:true}).click();
    await t.page.getByRole('dialog').getByRole('button',{name:'Confirm this version'}).click();
    await t.panel.getByText('Monthly report version 1 confirmed.',{exact:true}).waitFor();
    assert.match(await t.panel.innerText(),/Current confirmed/);assert.match(await t.panel.innerText(),/KES 601.00/);
    for(const format of ['Excel','PDF']){
      const downloadEvent=t.page.waitForEvent('download');await t.panel.getByRole('button',{name:`Export ${format}`,exact:true}).click();const download=await downloadEvent;
      assert.match(download.suggestedFilename(),/^smithsons_monthly_transport_2026-02_v1\./);
      const request=t.state.requests.find(r=>r.path.endsWith('/1/export'));assert.match(request.headers.authorization,/^Bearer test\./);
    }
    if(process.env.FRONTEND_SCREENSHOT_DIR){await mkdir(process.env.FRONTEND_SCREENSHOT_DIR,{recursive:true});await t.panel.screenshot({path:path.join(process.env.FRONTEND_SCREENSHOT_DIR,'monthly-expenses-confirmed.png')});}
    assert.deepEqual(t.state.errors,[]);
  }finally{await t.context.close();}
});

test('saved history, corrected versions and superseded figures are distinct',async()=>{
  const t=await setup({seed:true});try{
    await t.panel.getByRole('button',{name:'View saved report',exact:true}).click();await t.panel.getByLabel('Monthly report version').waitFor();
    await t.panel.getByRole('button',{name:'Create corrected version'}).click();
    await t.panel.getByLabel('Expense workbook',{exact:true}).setInputFiles({name:'expense.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('corrected workbook')});
    await t.panel.getByLabel('I checked that the DHL upload covers the full reporting month.').check();
    await t.panel.getByLabel('How did you check the monthly DHL data?').fill('Statement rechecked');await t.panel.getByLabel('Expense review note').fill('Correcting saved version');
    await t.panel.getByRole('button',{name:'Preview expenses',exact:true}).click();await t.panel.getByRole('button',{name:'Details for KCE726U'}).click();
    await t.panel.getByRole('button',{name:'Confirm zero for Telematics & VSS'}).click();await t.panel.getByLabel('I verified that KCE726U had no business this month.').check();await t.panel.getByLabel('How did you verify no business?').fill('Checked again');
    await t.panel.getByRole('button',{name:'Update preview',exact:true}).click();await t.page.waitForTimeout(100);await t.panel.getByRole('button',{name:'Save draft',exact:true}).click();
    await t.panel.getByText('Draft version 2 saved. Review it before confirming.',{exact:true}).waitFor();
    assert.equal(t.state.records[1].decisions.previous_version_id,1);
    await t.panel.getByRole('button',{name:'Confirm report',exact:true}).click();await t.page.getByRole('dialog').getByRole('button',{name:'Confirm this version'}).click();await t.panel.getByText('Monthly report version 2 confirmed.',{exact:true}).waitFor();
    await t.panel.getByLabel('Monthly report version').selectOption('1');await t.panel.getByText(/Historical report: this version has been superseded/).waitFor();
    assert.match(await t.panel.getByLabel('Monthly report version').innerText(),/Version 2 \(Current confirmed\)/);
    assert.deepEqual(t.state.errors,[]);
  }finally{await t.context.close();}
});

test('draft-only months are discoverable without presenting them as confirmed',async()=>{
  const t=await setup();try{
    t.state.records.push(snapshot(readyOptions,{id:1,version:1,status:'draft'}));
    await t.panel.getByRole('button',{name:'View saved report',exact:true}).click();await t.panel.getByLabel('Monthly report version').waitFor();
    assert.match(await t.panel.innerText(),/No report is currently confirmed/);assert.match(await t.panel.innerText(),/saved draft version 1/);
    assert.ok(t.state.requests.filter(r=>r.path==='/dhl-reports/monthly-net-summary').length===2);
  }finally{await t.context.close();}
});

test('missing setup, export errors and stale source errors remain readable',async()=>{
  const t=await setup({seed:true});try{
    t.state.fail={path:'/dhl-reports/monthly-net-summary',status:503,data:{detail:{code:'migration_required'}}};await t.panel.getByRole('button',{name:'View saved report',exact:true}).click();await t.panel.getByRole('alert').waitFor();assert.match(await t.panel.getByRole('alert').innerText(),/contact support/);
    await t.panel.getByRole('button',{name:'View saved report',exact:true}).click();await t.panel.getByLabel('Monthly report version').waitFor();
    t.state.fail={path:'/dhl-reports/expense-imports/1/export',status:503,data:{detail:{code:'migration_required'}}};await t.panel.getByRole('button',{name:'Export PDF',exact:true}).click();await t.panel.getByRole('alert').waitFor();assert.match(await t.panel.getByRole('alert').innerText(),/contact support/);
    t.state.records[0].status='draft';await t.panel.getByRole('button',{name:'View saved report',exact:true}).click();await t.panel.getByRole('button',{name:'Confirm report',exact:true}).waitFor();
    t.state.fail={path:'/dhl-reports/expense-imports/1/confirm',status:409,data:{detail:{code:'SourceChanged'}}};await t.panel.getByRole('button',{name:'Confirm report',exact:true}).click();await t.page.getByRole('dialog').getByRole('button',{name:'Confirm this version'}).click();await t.panel.getByRole('alert').waitFor();
    assert.match(await t.panel.getByRole('alert').innerText(),/new version/);assert.equal(t.state.records[0].status,'draft');assert.equal(await t.page.getByRole('dialog').isVisible(),false);
  }finally{await t.context.close();}
});

test('legacy DHL upload, summary, manual payslip and reconciliation controls still work',async()=>{
  const t=await setup();try{
    await t.page.getByRole('button',{name:'Refresh',exact:true}).click();await t.page.getByRole('heading',{name:'DHL Monthly Summary',exact:true}).waitFor();
    const legacyTable=t.page.getByRole('heading',{name:'DHL Monthly Summary',exact:true}).locator('..');await legacyTable.getByText('KAA123B',{exact:true}).waitFor();
    const label=t.page.locator('label').filter({hasText:'Upload DHL Excel'});await label.locator('input').setInputFiles({name:'raw.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('raw fixture')});
    await t.page.getByText('Uploaded. Inserted 2. Unmatched vehicles 0.',{exact:true}).waitFor();
    const payslip=t.page.getByRole('heading',{name:'Generate Payslip',exact:true}).locator('..');await payslip.locator('select').selectOption('1');await payslip.getByRole('button',{name:'Create Payslip',exact:true}).click();await t.page.getByText('Payslip saved.',{exact:true}).waitFor();
    const submitted=JSON.parse(t.state.requests.find(r=>r.path==='/dhl-reports/payslips'&&r.method==='POST').body);assert.equal(submitted.commission_rate,0.07);assert.equal(Object.hasOwn(submitted,'imported_expenses'),false);
    await t.page.getByRole('link',{name:'DHL Reconciliation',exact:true}).click();await t.page.getByRole('heading',{name:'DHL Reconciliation',exact:true}).waitFor();
    assert.equal(t.state.requests.some(r=>r.path.startsWith('/dhl-reports/expense-imports')&&r.method==='POST'),false);assert.deepEqual(t.state.errors,[]);
  }finally{await t.context.close();}
});


test('invalid workbooks, duplicate saves and preview failures do not confirm or replace reports',async()=>{
  const t=await setup();try{
    await openUpload(t);
    await t.panel.getByLabel('Expense workbook',{exact:true}).setInputFiles({name:'invalid.csv',mimeType:'text/csv',buffer:Buffer.from('not xlsx')});
    await t.panel.getByRole('button',{name:'Preview expenses',exact:true}).click();await t.panel.getByRole('alert').waitFor();assert.match(await t.panel.getByRole('alert').innerText(),/xlsx/);
    assert.equal(t.state.requests.some(r=>r.path.endsWith('/expense-imports/preview')),false);
    await t.panel.getByLabel('Expense workbook',{exact:true}).setInputFiles({name:'expense.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('fixture')});
    t.state.fail={path:'/dhl-reports/expense-imports/preview',status:500,data:{detail:'Internal Server Error'}};
    await t.panel.getByRole('button',{name:'Preview expenses',exact:true}).click();await t.panel.getByRole('alert').waitFor();assert.match(await t.panel.getByRole('alert').innerText(),/could not be processed/);
    assert.equal(await t.panel.getByRole('button',{name:'Save draft',exact:true}).isEnabled(),false);
    await t.panel.getByRole('button',{name:'Cancel upload',exact:true}).click();
    await completePreview(t);await t.page.waitForTimeout(150);
    t.state.records.push(snapshot(readyOptions,{id:1,version:1,status:'draft'}));
    await t.panel.getByRole('button',{name:'Save draft',exact:true}).click();await t.panel.getByRole('button',{name:'Open saved report',exact:true}).waitFor();
    await t.panel.getByRole('button',{name:'Open saved report',exact:true}).click();await t.panel.getByLabel('Monthly report version').waitFor();
    assert.equal(t.state.records.length,1);assert.equal(t.state.records[0].status,'draft');assert.deepEqual(t.state.errors,[]);
  }finally{await t.context.close();}
});

test('confirmation submits once and the panel remains usable at a smaller viewport',async()=>{
  const t=await setup({seed:true});try{
    t.state.records[0].status='draft';
    await t.panel.getByRole('button',{name:'View saved report',exact:true}).click();await t.panel.getByRole('button',{name:'Confirm report',exact:true}).waitFor();
    await t.panel.getByRole('button',{name:'Confirm report',exact:true}).click();t.state.delay=250;
    await t.page.getByRole('dialog').getByRole('button',{name:'Confirm this version'}).evaluate(button=>{button.click();button.click();});
    await t.panel.getByText('Monthly report version 1 confirmed.',{exact:true}).waitFor();
    assert.equal(t.state.requests.filter(r=>r.path.endsWith('/1/confirm')).length,1);
    await t.page.setViewportSize({width:780,height:1000});
    assert.ok(await t.panel.evaluate(element=>element.scrollWidth<=element.clientWidth+2));
    await t.panel.getByRole('button',{name:'Details for KCE726U'}).click();
    assert.match(await t.panel.innerText(),/negative balance/);
    if(process.env.FRONTEND_SCREENSHOT_DIR)await t.panel.screenshot({path:path.join(process.env.FRONTEND_SCREENSHOT_DIR,'monthly-expenses-compact.png')});
    assert.deepEqual(t.state.errors,[]);
  }finally{await t.context.close();}
});

test('saved-workbook correction reviews explicit historical exclusions without an expense upload', async()=>{
  const t=await setup({seed:true});try{
    const review={sheet:'Sheet1',date_issues:[{source_row:850,date:'2025-02-10',truck:'KAA123B',reference:'OLD',amount:'10',code:'out_of_period_date',reason:'Expected 2026-02; original date requires review'}]};
    const record=snapshot({...readyOptions,historical_review:review},{id:1,version:1,status:'draft'});t.state.records=[record];
    await t.panel.getByRole('button',{name:'View saved report',exact:true}).click();await t.panel.getByLabel('Monthly report version').waitFor();
    assert.equal(await t.panel.getByRole('button',{name:'Confirm report',exact:true}).isEnabled(),false);
    await t.panel.getByRole('button',{name:'Create corrected version',exact:true}).click();
    assert.match(await t.panel.innerText(),/Using the original saved expense workbook/);
    await t.panel.getByLabel('Expense review note').fill('Synthetic explicit date review');
    await t.panel.getByLabel('I checked that the DHL upload covers the full reporting month.').check();await t.panel.getByLabel('How did you check the monthly DHL data?').fill('Synthetic source checked');
    await t.panel.getByLabel('Date decision for row 850').selectOption('exclude_from_period');
    await t.panel.getByRole('button',{name:'Update preview',exact:true}).click();await t.panel.getByRole('alert').waitFor();assert.match(await t.panel.getByRole('alert').innerText(),/Explain why/);
    await t.panel.getByLabel('Review reason for row 850').fill('Synthetic historical date explicitly excluded');
    await t.panel.getByRole('button',{name:'Update preview',exact:true}).click();await t.panel.getByText('Preview updated. All figures below were calculated by Smithsons.',{exact:true}).waitFor();
    await t.panel.getByRole('button',{name:'Save draft',exact:true}).click();await t.panel.getByText(/Draft version 2 saved/).waitFor();
    const requests=t.state.requests.filter(r=>r.path.endsWith('/revise'));assert.equal(requests.length,2);
    assert.ok(requests.every(r=>!r.body.includes('name="file"')));assert.ok(requests.every(r=>r.body.includes('exclude_from_period')));
    assert.deepEqual(t.state.errors,[]);
  }finally{await t.context.close();}
});
