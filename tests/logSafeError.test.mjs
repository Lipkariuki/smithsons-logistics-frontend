import test from 'node:test';
import assert from 'node:assert/strict';
import {logApiError,logApiWarning} from '../src/utils/logSafeError.js';

test('API error diagnostics never log passwords, headers, tokens or response bodies', t=>{
  const calls=[];t.mock.method(console,'error',(...args)=>calls.push(args));
  const error={config:{data:'password=synthetic-password',headers:{Authorization:'Bearer synthetic-token'}},response:{status:401,data:{apiKey:'synthetic-provider-key'}}};
  logApiError('Login failed',error);
  assert.deepEqual(calls,[['Login failed',{statuses:[401]}]]);
  for(const value of ['synthetic-password','synthetic-token','synthetic-provider-key'])assert.equal(JSON.stringify(calls).includes(value),false);
});
test('API warnings retain only valid numeric HTTP status codes', t=>{
  const calls=[];t.mock.method(console,'warn',(...args)=>calls.push(args));
  logApiWarning('Update failed',{response:{status:409}},{response:{status:'private-data'}},{response:{status:503}});
  assert.deepEqual(calls,[['Update failed',{statuses:[409,503]}]]);
});
test('unstructured errors and non-API values never expose their contents', t=>{
  const calls=[];t.mock.method(console,'error',(...args)=>calls.push(args));
  logApiError('Request failed',new Error('synthetic-password'),'Bearer synthetic-token',null);
  assert.deepEqual(calls,[['Request failed',{statuses:[]}]]);
});
