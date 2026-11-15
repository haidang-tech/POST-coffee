import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const output = {};
new Function('exports', ts.transpileModule(
  fs.readFileSync('src/lib/order-preview.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText)(output);
const { previewOrder, searchText } = output;
const original = [
  { id: '1', menu_item_id: 'coffee', qty: 2, note: '', unit_price: 25000 },
  { id: '2', menu_item_id: 'coffee', qty: 1, note: 'ít đá', unit_price: 25000 },
];
const added = previewOrder(original, { type: 'add', item: { id: '3', menu_item_id: 'coffee', qty: 1, note: '', unit_price: 25000 } });
assert.equal(added.length, 2);
assert.equal(added[0].qty, 3);
assert.equal(added[1].qty, 1);
assert.equal(original[0].qty, 2);
assert.equal(previewOrder(original, { type: 'quantity', id: '1', qty: 0 }).length, 1);
assert.equal(previewOrder(original, { type: 'quantity', id: '2', qty: 4 })[1].qty, 4);
assert.equal(previewOrder([], { type: 'add', item: { id: 'new', menu_item_id: 'juice', qty: 1, note: '' } }).length, 1);
assert.equal(searchText('Cà phê ĐEN'), 'ca phe den');
assert.equal(searchText('Nước ép Ổi'), 'nuoc ep oi');
console.log('PASS: order previews preserve notes and server state; Vietnamese search');
