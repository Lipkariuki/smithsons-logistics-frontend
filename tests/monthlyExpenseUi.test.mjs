import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentMonth, monthDate, formatKes, negative, normalizeHeader, referenceCandidates,
  buildOptions, uploadForm, revisionForm, apiError, issueText,
} from '../src/pages/reports/monthlyExpenseUi.js';

const config = (overrides = {}) => ({ mappings: {}, corrections: {}, noActivity: {}, sourceChecked: false,
  sourceReference: '', reason: '', previousId: null, sheetName: '', referencesChecked: false,
  referenceColumns: {}, referenceReason: '', ...overrides });

test('missing money remains unavailable, explicit zero remains zero', () => {
  assert.equal(formatKes(null), 'Not available'); assert.equal(formatKes(undefined), 'Not available');
  assert.equal(formatKes('0.00'), 'KES 0.00'); assert.equal(formatKes('garbage'), 'Not available');
});
test('server decimal strings keep precision beyond JavaScript safe integers', () => {
  assert.equal(formatKes('9999999999999999.99'), 'KES 9,999,999,999,999,999.99');
  assert.equal(formatKes('-50.00'), 'KES -50.00'); assert.equal(formatKes('+0.01'), 'KES +0.01');
  assert.equal(negative('-50.00'), true); assert.equal(negative('-0.00'), false);
});
test('month payload is first day without timezone conversion', () => {
  assert.equal(monthDate('2026-02'), '2026-02-01'); assert.equal(currentMonth(new Date(2026, 1, 1)), '2026-02');
  assert.throws(() => monthDate('2026-13')); assert.throws(() => monthDate(''));
});
test('manual candidates exclude intermediate net paid columns', () => {
  const fields = ['GROSS AMOUNT','NET PAID I','NET PAID 1','NET PAID 2','NET PAID','NET PAY','7% COMMISSION'];
  const result = referenceCandidates(fields.map(original_header => ({ original_header })));
  assert.deepEqual(result.net_payable, ['NET PAID','NET PAY']); assert.deepEqual(result.commission, ['7% COMMISSION']);
  assert.equal(normalizeHeader('  TRUCK REG.NO '), 'truck reg no');
});
test('approved mappings, ignored columns and explicit zero corrections retain their meaning', () => {
  const result = buildOptions(config({ mappings: { TYRES:'Tyres', Note:null }, corrections:{D17:'0.00',B3:''}, reason:'Checked zero' }));
  assert.deepEqual(result.approved_mappings,{TYRES:'Tyres',Note:null}); assert.deepEqual(result.corrections,{D17:'0.00'});
  assert.deepEqual(result.verified_no_activity, {}); assert.equal(result.source_verification,'');
});
test('mapping and correction decisions need a review note', () => {
  assert.throws(() => buildOptions(config({mappings:{TYRES:'Tyres'}})), /Explain/);
  assert.throws(() => buildOptions(config({corrections:{D17:'0.00'}})), /Explain/);
  assert.throws(() => buildOptions(config({previousId:1})), /Explain/);
  assert.throws(() => buildOptions(config({mappings:{TYRES:''},reason:'Checked'})), /category/);
});
test('corrections are strings, with no client calculation or blank-to-zero conversion', () => {
  const result = buildOptions(config({corrections:{D17:'',B3:'1234.565'},reason:'Checked'}));
  assert.deepEqual(result.corrections,{B3:'1234.565'});
  assert.throws(() => buildOptions(config({corrections:{B3:'NaN'},reason:'Checked'})), /valid amounts/);
  for (const key of ['gross','commission','net_payable','operating_expenses']) assert.equal(Object.hasOwn(result,key),false);
});
test('source completeness is not silently attested', () => {
  assert.equal(buildOptions(config({sourceReference:'old reference'})).source_verification,'');
  assert.throws(() => buildOptions(config({sourceChecked:true})), /checked/);
  assert.equal(buildOptions(config({sourceChecked:true,sourceReference:'Statement checked'})).source_verification,'Statement checked');
});
test('no-business selections require their own explicit evidence', () => {
  assert.throws(() => buildOptions(config({noActivity:{KCE726U:''}})), /verified no monthly business/);
  assert.deepEqual(buildOptions(config({noActivity:{KCE726U:'Dispatch checked'}})).verified_no_activity,{KCE726U:'Dispatch checked'});
});
test('manual figures are not compared without explicit verification', () => {
  const selected={referenceColumns:{net_payable:'NET PAID'},referenceReason:'Checked'};
  assert.deepEqual(buildOptions(config(selected)).reference_columns,{});
  assert.throws(() => buildOptions(config({...selected,referencesChecked:true,referenceReason:''})),/verif/);
  assert.deepEqual(buildOptions(config({...selected,referencesChecked:true})).reference_columns,{net_payable:'NET PAID'});
});
test('multipart sends month/options/files without financial totals', async () => {
  const file = new File(['fixture'],'expense.xlsx'); const form=uploadForm(file,'2026-02',buildOptions(config()));
  assert.equal(form.get('month'),'2026-02-01'); assert.equal(form.get('file').name,'expense.xlsx');
  assert.equal(form.has('net_payable'),false); assert.equal(form.get('raw_trips_file'),null);
  assert.throws(() => uploadForm(new File(['x'],'bad.xls'),'2026-02',{}),/xlsx/);
  assert.throws(() => uploadForm({name:'large.xlsx',size:20_000_001},'2026-02',{}),/20 MB/);
});
test('object and blob API errors are readable, never React objects', async () => {
  const duplicate = await apiError({response:{status:409,data:{detail:{code:'duplicate_import',existing_import_id:4}}}});
  assert.equal(duplicate.duplicateId,4); assert.match(duplicate.message,/already/);
  const error=await apiError({response:{status:503,data:new Blob([JSON.stringify({detail:{code:'migration_required'}})])}});
  assert.match(error.message,/contact support/);
  assert.match((await apiError({response:{status:401}})).message,/Sign in/);
  assert.match((await apiError({response:{status:403}})).message,/administrator/);
});
test('source/version conflicts require review rather than silent refresh', async () => {
  assert.match((await apiError({response:{status:409,data:{detail:{code:'SourceChanged'}}}})).message,/new version/);
  assert.match((await apiError({response:{status:409,data:{detail:{code:'VersionConflict'}}}})).message,/Reload/);
});
test('warnings identify missing truck amounts in plain language', () => {
  const row={normalized_plate:'KCE726U',deductions:{telematics_vss:{label:'Telematics & VSS',source_cell:'D17'}}};
  assert.match(issueText({code:'blank_expense',cell:'D17'},row),/KCE726U: Telematics & VSS amount is missing/);
  assert.match(issueText({code:'optional_category_absent'}),/KES 0.00 assumed/);
  assert.match(issueText({code:'negative_net_balance_review'},row),/nothing has been written off/);
});

test('historical exclusions require a reason and never send financial totals', () => {
  assert.throws(() => buildOptions(config({dateDispositions:{'850':{action:'exclude_from_period',reason:''}}})), /Explain why/);
  const result=buildOptions(config({dateDispositions:{'850':{action:'exclude_from_period',reason:'Historical date reviewed'}}}));
  assert.equal(result.date_dispositions['850'].reason,'Historical date reviewed');
  assert.equal(Object.hasOwn(result,'gross'),false);
});
test('saved revisions send the original hash and decisions without an expense upload', () => {
  const form=revisionForm({storedHash:'original-hash'},buildOptions(config()));
  assert.equal(form.has('file'),false);assert.equal(form.get('expected_file_sha256'),'original-hash');
  assert.equal(form.has('raw_trips_file'),false);
});
test('operating expense reference columns are comparisons only', () => {
  const columns=referenceCandidates(['TOTAL EXPENSES','NET PAID I'].map(original_header=>({original_header})));
  assert.deepEqual(columns.operating_expenses,['TOTAL EXPENSES']);assert.deepEqual(columns.net_payable,[]);
});
