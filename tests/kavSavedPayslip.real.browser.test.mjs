import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const base=process.env.FRONTEND_TEST_URL||'http://127.0.0.1:8067',api='http://127.0.0.1:8071';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Only synthetic localhost testing is permitted');

test('KAV086M saved workbooks create a reviewed draft and exact immutable payslip independently',
 {skip:!process.env.KAV_BROWSER_FIXTURE_JSON},async()=>{
 const fixture=JSON.parse(fs.readFileSync(process.env.KAV_BROWSER_FIXTURE_JSON));assert.equal(fixture.synthetic,true);
 assert.equal(fixture.month,'2026-02');
 const cfg=JSON.parse(fs.readFileSync(process.env.LEGACY_AUTH_FIXTURE_JSON));
 const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),posts=[],errors=[];
 await context.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 page.on('request',request=>{if(request.method()==='POST')posts.push(new URL(request.url()).pathname)});
 page.on('pageerror',error=>errors.push(error.name));
 page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'SYNTHETIC KAV confirmation test only — no real approval':undefined));
 const panel=page.locator('#monthly-expense-reports'),saved=page.getByRole('region',{name:'Saved Monthly Files'});
 const login=async()=>{
  await page.goto(base+'/login');await page.getByPlaceholder('Phone',{exact:true}).fill('0700000001');
  await page.getByPlaceholder('Password',{exact:true}).fill(cfg.password);await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**/admin/dashboard');
 };
 const openMonth=async()=>{await page.goto(base+'/admin/reports/dhl');await page.getByLabel('Expense reporting month').fill(fixture.month);};
 const workbook=(name,key)=>({name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(fixture[key],'base64')});
 try{
  await login();await openMonth();await saved.getByText('Upload new DHL month',{exact:true}).waitFor();
  await saved.getByLabel('Saved DHL Trips Summary').setInputFiles(workbook('synthetic-kav-trips.xlsx','raw'));
  await saved.getByText('Evidence matches saved DHL records — administrator review required',{exact:true}).waitFor();
  await saved.getByRole('button',{name:'Upload Net Summary',exact:true}).click();
  await panel.getByLabel('Expense workbook',{exact:true}).setInputFiles(workbook('synthetic-kav-expenses.xlsx','net'));
  await panel.getByRole('button',{name:'Preview expenses',exact:true}).click();await panel.getByRole('button',{name:'Save draft',exact:true}).click();
  await panel.getByText('Draft version 1 saved. Review it before confirming.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Logout',exact:true}).click();await page.waitForURL('**/login');await login();await openMonth();
  await saved.getByText(/To calculate payouts, choose/).waitFor();
  await saved.getByRole('button',{name:'Verify evidence against saved records',exact:true}).click();
  await saved.getByText('Evidence matches saved DHL records — administrator review required',{exact:true}).waitFor();
  // No file selection after reopening: the revise API must reuse BOTH originals.
  await saved.getByRole('button',{name:'Review verification / reuse saved expenses',exact:true}).click();
  await panel.getByLabel('I checked that the DHL upload covers the full reporting month.').check();
  await panel.getByLabel('How did you check the monthly DHL data?').fill('SYNTHETIC KAV086M source test only — no real financial approval');
  await panel.getByLabel('Expense review note').fill('SYNTHETIC saved-workbook review');
  await panel.getByRole('button',{name:'Update preview',exact:true}).click();await panel.getByRole('button',{name:'Save draft',exact:true}).click();
  await panel.getByText('Draft version 2 saved. Review it before confirming.',{exact:true}).waitFor();
  const headers={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};
  const meta=await (await context.request.get(`${api}/dhl-reports/monthly-files?month=2026-02-01`,{headers})).json();
  const report=await (await context.request.get(`${api}/dhl-reports/expense-imports/${meta.latest_report_id}`,{headers})).json();
  const kav=report.rows.find(row=>row.normalized_plate==='KAV086M'),pending=report.rows.find(row=>row.normalized_plate==='PENDING999');
  assert.deepEqual(['gross','operating_expenses','commission_base','commission','net_payable'].map(k=>kav[k]),['302109.41','152534.00','149575.41','10470.28','139105.13']);
  assert.equal(report.can_confirm,false);assert.equal(kav.truck_confirmation.can_confirm,true);assert.equal(pending.truck_confirmation.can_confirm,false);
  assert.equal(meta.raw_files.length,1);assert.equal(meta.expense_files.length,2);assert.equal(meta.expense_files[0].content_sha256,meta.expense_files[1].content_sha256);
  await panel.getByRole('button',{name:'Details for KAV086M',exact:true}).click();await panel.getByRole('button',{name:'Confirm this truck',exact:true}).click();
  await panel.getByText('KAV086M confirmed independently. Other trucks remain unchanged.',{exact:true}).waitFor();
  const downloading=page.waitForEvent('download');await panel.getByRole('button',{name:'Generate / download truck statement',exact:true}).click();
  const download=await downloading,pdfPath=await download.path(),pdf=fs.readFileSync(pdfPath);assert.ok(pdf.length>1000);assert.doesNotMatch(download.suggestedFilename(),/dhl/i);
  const content=execFileSync(process.env.PDF_TEST_PYTHON||'python3',['-c','from pypdf import PdfReader;import sys;print("\\n".join(p.extract_text() for p in PdfReader(sys.argv[1]).pages))',pdfPath],{encoding:'utf8'});
  for(const label of ['SMITHSONS LOGISTICS','KAV086M','2026-02-01 to 2026-02-28','Distribution Revenue','Offloading Revenue','FUEL','TELEMATICS & VSS','SHUNTING','Total Expenses','Commission Base','Net Payable'])assert.ok(content.includes(label),label);
  for(const amount of ['294,261.41','7,848.00','302,109.41','141,386.00','8,758.00','2,390.00','152,534.00','149,575.41','10,470.28','139,105.13'])assert.ok(content.includes('KES '+amount),amount);
  assert.doesNotMatch(content,/DHL|999,999/);assert.ok(!content.includes('GPRS'));
  const after=await (await context.request.get(`${api}/dhl-reports/expense-imports/${report.id}`,{headers})).json();
  assert.equal(after.status,'draft');assert.equal(after.rows.find(row=>row.normalized_plate==='PENDING999').truck_confirmation.record,null);
  const original=await (await context.request.get(`${api}/dhl-reports/expense-imports/${meta.expense_files[1].id}`,{headers})).json();assert.equal(original.rows.find(row=>row.normalized_plate==='KAV086M').gross,null);
  await page.reload();await page.getByLabel('Expense reporting month').fill(fixture.month);await panel.getByRole('button',{name:'Details for KAV086M',exact:true}).click();
  const again=page.waitForEvent('download');await panel.getByRole('button',{name:'Generate / download truck statement',exact:true}).click();assert.deepEqual(fs.readFileSync(await (await again).path()),pdf);
  assert.equal(posts.filter(p=>p==='/dhl-reports/upload').length,1);assert.equal(posts.filter(p=>p==='/dhl-reports/expense-imports').length,1);assert.equal(posts.filter(p=>/\/expense-imports\/\d+\/revise$/.test(p)).length,2);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
