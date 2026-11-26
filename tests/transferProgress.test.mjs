import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transferPercent,isCancelled} from '../src/pages/reports/transferProgress.js';
test('progress is derived only from actual byte counts',()=>{assert.equal(transferPercent({loaded:25,total:100}),25);assert.equal(transferPercent({loaded:100,total:100}),100);assert.equal(transferPercent({loaded:101,total:100}),100);});
test('unknown transfer sizes remain indeterminate',()=>{for(const total of [undefined,null,0,NaN,Infinity])assert.equal(transferPercent({loaded:25,total}),null);});
test('cancel is distinguished from timeout and server failure',()=>{assert.equal(isCancelled({code:'ERR_CANCELED'}),true);assert.equal(isCancelled({name:'AbortError'}),true);assert.equal(isCancelled({code:'ECONNABORTED'}),false);assert.equal(isCancelled({response:{status:503}}),false);});
