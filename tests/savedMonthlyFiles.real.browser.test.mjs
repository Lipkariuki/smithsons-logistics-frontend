import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const base=process.env.FRONTEND_TEST_URL||'http://127.0.0.1:8067',api='http://127.0.0.1:8071';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Only disposable localhost acceptance tests permitted');
test('saved monthly files survive logout; confirmed statements and corrected versions need no repeated sources',{skip:!process.env.SAVED_FILES_BROWSER_FIXTURE_JSON},async()=>{
 const fixture=JSON.parse(fs.readFileSync(process.env.SAVED_FILES_BROWSER_FIXTURE_JSON));assert.equal(fixture.synthetic,true);
 const cfg=JSON.parse(fs.readFileSync(process.env.LEGACY_AUTH_FIXTURE_JSON));
 const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1100}}),page=await context.newPage(),requests=[],errors=[];
 await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 page.on('request',r=>{if(r.method()==='POST')requests.push(new URL(r.url()).pathname)});page.on('pageerror',e=>errors.push(e.name));
 page.on('dialog',d=>d.accept(d.type()==='prompt'?'SYNTHETIC saved sources reviewed':undefined));
 const login=async()=>{await page.goto(base+'/login');await page.getByPlaceholder('Phone',{exact:true}).fill('0700000001');await page.getByPlaceholder('Password',{exact:true}).fill(cfg.password);await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**/admin/dashboard');};
 const month=async()=>{await page.goto(base+'/admin/reports/dhl');await page.getByLabel('Expense reporting month').fill(fixture.month);};
 const file=(name,key)=>({name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(fixture[key],'base64')});
 const panel=page.locator('#monthly-expense-reports'),saved=page.getByRole('region',{name:'Saved Monthly Files'});
 async function checkSource(){await panel.getByLabel('I checked that the DHL upload covers the full reporting month.').check();await panel.getByLabel('How did you check the monthly DHL data?').fill('Synthetic full raw workbook and dispatch checked');await panel.getByLabel('Expense review note').fill('Synthetic source and expense review');}
 try{
  await login();await month();await saved.getByRole('heading',{name:'DHL Trips Summary: Missing',exact:true}).waitFor();
  await saved.getByLabel('Saved DHL Trips Summary').setInputFiles(file('synthetic-month-trips.xlsx','raw'));
  await saved.getByRole('heading',{name:'DHL Trips Summary: Uploaded',exact:true}).waitFor();
  await saved.getByRole('button',{name:'Verify evidence against saved records',exact:true}).click();await saved.getByText('Evidence matches saved DHL records — administrator review required',{exact:true}).waitFor();
  await saved.getByRole('button',{name:'Upload Net Summary',exact:true}).click();await panel.getByLabel('Expense workbook',{exact:true}).setInputFiles(file('synthetic-month-net.xlsx','net'));await checkSource();
  await panel.getByRole('button',{name:'Preview expenses',exact:true}).click();await panel.getByLabel('Classify Tyres',{exact:true}).selectOption('expense');await panel.getByLabel('Category name for Tyres',{exact:true}).fill('Tyres');
  await panel.getByRole('button',{name:'Update preview',exact:true}).click();await panel.getByRole('button',{name:'Save draft',exact:true}).click();await panel.getByText('Draft version 1 saved. Review it before confirming.',{exact:true}).waitFor();
  assert.equal(requests.filter(p=>p==='/dhl-reports/upload').length,1);
  await page.getByRole('button',{name:'Logout',exact:true}).click();await page.waitForURL('**/login');await login();await month();
  await panel.getByRole('button',{name:'Details for TEST100A',exact:true}).click();await panel.getByRole('button',{name:'Confirm this truck',exact:true}).click();await panel.getByText('TEST100A confirmed independently. Other trucks remain unchanged.',{exact:true}).waitFor();
  const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Generate / download truck statement',exact:true}).click();const first=fs.readFileSync(await (await download).path());assert.ok(first.length>1000);
  const headers={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};
  const meta=await (await context.request.get(`${api}/dhl-reports/monthly-files?month=${fixture.month}-01`,{headers})).json();assert.equal(meta.raw_files.length,1);assert.equal(meta.expense_files.length,1);
  const id=meta.latest_report_id,original=await (await context.request.get(`${api}/dhl-reports/expense-imports/${id}`,{headers})).json();assert.equal(original.rows[0].net_payable,'795.15');assert.ok(original.decisions.historical_review.archive_id);assert.equal(original.raw_source_file.version,1);assert.equal(original.status,'draft');
  const docs=await (await context.request.get(`${api}/dhl-reports/expense-imports/${id}/statement-documents`,{headers})).json();assert.equal(docs.length,1);
  const raw=await context.request.get(api+meta.raw_files[0].download,{headers});assert.deepEqual(await raw.body(),Buffer.from(fixture.raw,'base64'));
  const net=await context.request.get(api+meta.expense_files[0].download,{headers});assert.deepEqual(await net.body(),Buffer.from(fixture.net,'base64'));
  await saved.getByRole('button',{name:'Review verification / reuse saved expenses',exact:true}).click();await panel.getByLabel('Expense workbook',{exact:true}).setInputFiles(file('synthetic-month-revised.xlsx','replacement'));await checkSource();
  await panel.getByRole('button',{name:'Preview expenses',exact:true}).click();await panel.getByRole('button',{name:'Save draft',exact:true}).click();await panel.getByText('Draft version 2 saved. Review it before confirming.',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Details for TEST100A',exact:true}).click();await panel.getByRole('button',{name:'Confirm this truck',exact:true}).click();await panel.getByText('TEST100A confirmed independently. Other trucks remain unchanged.',{exact:true}).waitFor();
  const current=await (await context.request.get(`${api}/dhl-reports/monthly-net-summary?month=${fixture.month}-01&version=2`,{headers})).json();assert.equal(current.rows[0].net_payable,'702.15');assert.equal(current.rows[0].truck_confirmation.record.validation.financial_adjustment.net_payable_difference,'-93.00');
  const old=await context.request.get(`${api}/dhl-reports/monthly-statement-documents/${docs[0].id}/pdf`,{headers});assert.deepEqual(await old.body(),first);
  await page.reload();await page.getByLabel('Expense reporting month').fill(fixture.month);await panel.getByRole('combobox',{name:'Monthly report version'}).selectOption(String(id));
  await page.waitForFunction(()=>document.querySelector('#monthly-expense-reports')?.getAttribute('aria-busy')==='false'&&Array.from(document.querySelectorAll('#monthly-expense-reports span')).some(s=>s.textContent==='Superseded'));
  await panel.getByRole('button',{name:'Details for TEST100A',exact:true}).click();
  const again=page.waitForEvent('download');await panel.getByRole('button',{name:'Generate / download truck statement',exact:true}).click();assert.deepEqual(fs.readFileSync(await (await again).path()),first);
  assert.equal(requests.filter(p=>p==='/dhl-reports/upload').length,1);assert.equal(requests.filter(p=>p==='/dhl-reports/expense-imports').length,2);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});

test('attach original evidence checks existing revenue without calling replacement upload',{skip:!process.env.EVIDENCE_BROWSER_FIXTURE_JSON},async()=>{
 const fixture=JSON.parse(fs.readFileSync(process.env.EVIDENCE_BROWSER_FIXTURE_JSON));assert.equal(fixture.synthetic,true);
 const cfg=JSON.parse(fs.readFileSync(process.env.LEGACY_AUTH_FIXTURE_JSON));
 const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const context=await browser.newContext(),page=await context.newPage(),posts=[];
 await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 page.on('request',r=>{if(r.method()==='POST')posts.push(new URL(r.url()).pathname)});
 try{
  await page.goto(base+'/login');await page.getByPlaceholder('Phone',{exact:true}).fill('0700000001');await page.getByPlaceholder('Password',{exact:true}).fill(cfg.password);await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**/admin/dashboard');
  await page.goto(base+'/admin/reports/dhl');await page.getByLabel('Expense reporting month').fill(fixture.month);
  const saved=page.getByRole('region',{name:'Saved Monthly Files'});await saved.getByText('Attach original workbook to verify existing DHL records',{exact:true}).waitFor();
  await saved.getByLabel('Saved DHL Trips Summary').setInputFiles({name:'synthetic-original-evidence.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(fixture.raw,'base64')});
  await saved.getByText('Evidence matches saved DHL records — administrator review required',{exact:true}).waitFor();
  assert.equal(posts.filter(p=>p==='/dhl-reports/monthly-files/dhl').length,1);assert.equal(posts.filter(p=>p==='/dhl-reports/upload').length,0);
  const headers={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};
  const meta=await (await context.request.get(`${api}/dhl-reports/monthly-files?month=${fixture.month}-01`,{headers})).json();
  assert.equal(meta.parsed_dhl.records,1);assert.equal(meta.parsed_dhl.gross,'1000.00');assert.equal(meta.source_verified,false);assert.equal(meta.raw_files[0].verification.matches,true);assert.equal(meta.latest_report_id,null);
 }finally{await browser.close();}
});
