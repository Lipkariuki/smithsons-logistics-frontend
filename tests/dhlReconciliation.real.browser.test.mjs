// Real local frontend/backend requests; no API interception or production access.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const base=process.env.FRONTEND_TEST_URL||'http://127.0.0.1:8067';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local frontend required');

test('existing Check Month shows reference and truck details from real authenticated APIs without writes', {skip:!process.env.LEGACY_AUTH_FIXTURE_JSON}, async()=>{
  const config=JSON.parse(fs.readFileSync(process.env.LEGACY_AUTH_FIXTURE_JSON,'utf8'));
  const runtime=process.env.PLAYWRIGHT_MODULE||'playwright';
  const {chromium}=await import(runtime.startsWith('/')?pathToFileURL(runtime).href:runtime);
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  const context=await browser.newContext({viewport:{width:1400,height:1100}});
  // Block remote network, without mocking any local API response.
  await context.route('**/*', route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const page=await context.newPage();const writes=[];const failures=[];
  page.on('request',request=>{if(request.method()!=='GET'&&request.method()!=='OPTIONS'&&!new URL(request.url()).pathname.endsWith('/login'))writes.push(request.method()+' '+new URL(request.url()).pathname);});
  page.on('response',response=>{if(response.status()>=500)failures.push(response.status());});
  try{
    await page.goto(base+'/login');
    await page.getByPlaceholder('Phone',{exact:true}).fill('0700000001');
    await page.getByPlaceholder('Password',{exact:true}).fill(config.password);
    await page.getByRole('button',{name:'Login',exact:true}).click();
    await page.waitForURL('**/admin/dashboard');
    await page.goto(base+'/admin/reports/dhl-reconciliation');
    await page.locator('input[type=date]').nth(0).fill('2026-10-01');
    await page.locator('input[type=date]').nth(1).fill('2026-10-31');
    const response=page.waitForResponse(r=>r.url().includes('/dhl-reports/reconciliation?'));
    await page.getByRole('button',{name:'Check Month',exact:true}).click();
    assert.equal((await response).status(),200);
    await page.getByRole('heading',{name:'Order Reconciliation',exact:true}).waitFor();
    await page.getByRole('heading',{name:'Truck Financial Reconciliation',exact:true}).waitFor();
    assert.match(await page.getByRole('table',{name:'Order reconciliation details',exact:true}).innerText(),/SYNTHETIC-1/);
    assert.match(await page.getByRole('table',{name:'Truck financial reconciliation details',exact:true}).innerText(),/TEST100A/);
    await page.getByLabel('Order reconciliation filter').selectOption('matched');
    assert.equal(await page.getByRole('table',{name:'Order reconciliation details',exact:true}).locator('tbody tr').count(),0);
    await page.getByLabel('Order reconciliation filter').selectOption('unmatched');
    assert.ok(await page.getByRole('table',{name:'Order reconciliation details',exact:true}).locator('tbody tr').count()>0);
    await page.getByLabel('Expense report version').fill('1');
    await page.getByRole('button',{name:'Check Month',exact:true}).click();
    await page.getByText('Expense workbook version 1 (draft).',{exact:false}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Vehicle Comparison',exact:true}).count(),1);
    assert.deepEqual(writes,[]);assert.deepEqual(failures,[]);
    await page.getByRole('button',{name:'Check Month',exact:true}).waitFor();
    if(process.env.RECONCILIATION_SCREENSHOT)await page.screenshot({path:process.env.RECONCILIATION_SCREENSHOT,fullPage:true});
  }finally{await context.close();await browser.close();}
});
