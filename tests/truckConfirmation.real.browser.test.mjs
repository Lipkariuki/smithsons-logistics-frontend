// Real APIs, synthetic accounts, disposable PostgreSQL. No mocked financial results.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const base=process.env.FRONTEND_TEST_URL||'http://127.0.0.1:8067';
const api=process.env.TRUCK_TEST_API_URL||'http://127.0.0.1:8071';
for(const value of [base,api])if(!['localhost','127.0.0.1'].includes(new URL(value).hostname))throw new Error('Only localhost test targets permitted');

test('verified truck confirms and downloads exact stored PDF while another truck remains unresolved', {skip:!process.env.TRUCK_BROWSER_FIXTURE_JSON},async()=>{
  const fixture=JSON.parse(fs.readFileSync(process.env.TRUCK_BROWSER_FIXTURE_JSON,'utf8'));assert.equal(fixture.synthetic_fixture,true);
  const cfg=JSON.parse(fs.readFileSync(process.env.LEGACY_AUTH_FIXTURE_JSON,'utf8'));
  const runtime=process.env.PLAYWRIGHT_MODULE||'playwright';const {chromium}=await import(runtime.startsWith('/')?pathToFileURL(runtime).href:runtime);
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1400,height:1100}});
  await context.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage();const failures=[];
  page.on('response',response=>{if(response.status()>=500)failures.push(response.status());});
  page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'Synthetic administrator checked this truck only':undefined));
  try{
    await page.goto(base+'/login');await page.getByPlaceholder('Phone',{exact:true}).fill('0700000001');await page.getByPlaceholder('Password',{exact:true}).fill(cfg.password);
    await page.getByRole('button',{name:'Login',exact:true}).click();await page.waitForURL('**/admin/dashboard');
    await page.goto(base+'/admin/reports/dhl');const panel=page.locator('#monthly-expense-reports');
    await panel.getByLabel('Expense reporting month').fill(fixture.reporting_month || '2026-03');await panel.getByRole('button',{name:'View saved report',exact:true}).click();
    await panel.getByRole('button',{name:'Details for TEST100A',exact:true}).click();
    await panel.getByRole('button',{name:'Confirm this truck',exact:true}).click();
    await panel.getByText('TEST100A confirmed independently. Other trucks remain unchanged.',{exact:true}).waitFor();
    assert.match(await panel.innerText(),/1 truck\(s\) confirmed, 1 pending/);
    assert.equal(await panel.getByRole('button',{name:'Confirm report',exact:true}).isEnabled(),false);
    const download=page.waitForEvent('download');await panel.getByRole('button',{name:'Generate / download truck statement',exact:true}).click();
    const file=await download;assert.equal(await file.failure(),null);assert.match(file.suggestedFilename(),/^smithsons_monthly_transport_statement_\d+\.pdf$/);
    const headers={Authorization:'Bearer '+await page.evaluate(()=>localStorage.getItem('token'))};
    const snapshot=await (await context.request.get(`${api}/dhl-reports/expense-imports/${fixture.import_id}`,{headers})).json();
    assert.equal(snapshot.status,'draft');assert.equal(snapshot.rows[1].truck_confirmation.status,'needs_review');
    assert.equal(snapshot.rows[0].net_payable,'674.25');
    const documents=await (await context.request.get(`${api}/dhl-reports/expense-imports/${fixture.import_id}/statement-documents`,{headers})).json();assert.equal(documents.length,1);
    const stored=await context.request.get(`${api}/dhl-reports/monthly-statement-documents/${documents[0].id}/pdf`,{headers});
    const data=await stored.body();assert.equal(createHash('sha256').update(data).digest('hex'),documents[0].pdf_sha256);
    assert.deepEqual(data,fs.readFileSync(await file.path()));
    await page.goto(base+'/admin/reports/dhl-reconciliation');await page.locator('input[type=date]').nth(0).fill(`${fixture.reporting_month || '2026-03'}-01`);await page.locator('input[type=date]').nth(1).fill(fixture.end_date || '2026-03-31');
    await page.getByRole('button',{name:'Check Month',exact:true}).click();
    await page.getByText('Truck confirmed in version 1',{exact:false}).waitFor();
    assert.match(await page.getByRole('table',{name:'Order reconciliation details',exact:true}).innerText(),/DHL only/);
    assert.deepEqual(failures,[]);
  }finally{await context.close();await browser.close();}
});
