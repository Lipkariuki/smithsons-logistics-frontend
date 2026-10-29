import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const runtime=process.env.PLAYWRIGHT_MODULE||'playwright';
const {chromium}=await import(runtime.startsWith('/')?pathToFileURL(runtime).href:runtime);
const base=process.env.FRONTEND_TEST_URL||'http://127.0.0.1:8068';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Authentication logging tests require a local frontend');

test('failed login displays the same message without logging Axios credentials or tokens',async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  const context=await browser.newContext();
  const messages=[];let intercepted=false;
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname.endsWith('/login')&&request.method()==='POST'){
      intercepted=true;
      return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({detail:'synthetic-provider-key Bearer synthetic-token'})});
    }
    return ['localhost','127.0.0.1'].includes(url.hostname)?route.continue():route.abort();
  });
  try{
    const page=await context.newPage();
    page.on('console',message=>messages.push(Promise.all(message.args().map(argument=>argument.jsonValue().catch(()=>null)))));
    await page.goto(base+'/login');await page.getByPlaceholder('Phone',{exact:true}).fill('0700000007');
    await page.getByPlaceholder('Password',{exact:true}).fill('synthetic-password');const logged=page.waitForEvent('console',{predicate:message=>message.text().includes('Login failed')});await page.getByRole('button',{name:'Login',exact:true}).click();
    await page.getByText('Invalid phone or password',{exact:true}).waitFor();
    await logged;assert.equal(intercepted,true);const values=(await Promise.all(messages)).flat();const output=JSON.stringify(values);
    assert.equal(values.some(value=>value?.statuses?.includes(401)),true);
    for(const sensitive of ['synthetic-password','synthetic-provider-key','synthetic-token','0700000007'])assert.equal(output.includes(sensitive),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem('token')),null);
  }finally{await context.close();await browser.close();}
});
