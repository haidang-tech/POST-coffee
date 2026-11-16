import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const output = {};
const calls = [];
const tableId = '11111111-1111-4111-8111-111111111111';
const orderId = '22222222-2222-4222-8222-222222222222';
let rpcError = null;
let authError = null;
const mocks = {
  'next/cache': { revalidatePath: (path) => calls.push(['refresh', path]) },
  'next/navigation': { redirect: (path) => { throw Object.assign(new Error('redirect'), { destination: path }); } },
  '@/lib/auth': { assertStaff: async () => { if (authError) throw authError; } },
  '@/lib/errors': { friendlyError: () => 'Không thể mở đơn' },
  '@/lib/supabase/server': { createClient: async () => ({ rpc: async (name, params) => {
    calls.push(['rpc', name, params]);
    return { data: rpcError ? null : { id: orderId }, error: rpcError };
  } }) },
};
new Function('exports', 'require', ts.transpileModule(
  fs.readFileSync('src/app/pos/actions.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText)(output, (name) => mocks[name] ?? require(name));

assert.equal((await output.openTableAction('invalid')).ok, false);
assert.equal(calls.length, 0, 'Invalid input must not create an order');
await assert.rejects(output.openTableAction(tableId), (error) => error.destination === `/pos/ban/${orderId}?view=menu`);
assert.deepEqual(calls.filter(([type]) => type === 'rpc'), [
  ['rpc', 'pos_create_order', { p_table_id: tableId, p_note: '' }],
], 'Opening a table uses exactly one existing RPC');
assert.deepEqual(calls.filter(([type]) => type === 'refresh').map(([, path]) => path), ['/pos', '/admin', '/admin/don-hang']);

calls.length = 0;
rpcError = { message: 'TABLE_UNAVAILABLE' };
assert.equal((await output.openTableAction(tableId)).ok, false);
assert.equal(calls.filter(([type]) => type === 'refresh').length, 0, 'Failed creation must not redirect or refresh');
calls.length = 0;
authError = new Error('UNAUTHENTICATED');
assert.equal((await output.openTableAction(tableId)).ok, false);
assert.equal(calls.length, 0, 'Authorization must run before order creation');
console.log('PASS: single-action order navigation; validation, authorization and RPC failures preserved');
