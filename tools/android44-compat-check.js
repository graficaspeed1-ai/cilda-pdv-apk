/* ES5 compatibility regression checks for Android 4.4.4. */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function FakeElement() { this.nodeType = 1; this.parentNode = null; this.parentElement = null; this.action = false; }
FakeElement.prototype.webkitMatchesSelector = function (selector) { return selector === '[data-a]' && this.action; };
function FakeXHR() { this.readyState = 0; this.status = 200; this.responseText = '{"ok":true}'; this.headers = {}; }
FakeXHR.prototype.open = function (method, url, async) { this.method = method; this.url = url; this.async = async; };
FakeXHR.prototype.setRequestHeader = function (name, value) { this.headers[name] = value; };
FakeXHR.prototype.getResponseHeader = function () { return null; };
FakeXHR.prototype.send = function (body) { this.body = body; this.readyState = 4; if (this.onreadystatechange) this.onreadystatechange(); };
FakeXHR.prototype.abort = function () {};
async function run() {
  const ctx = { setTimeout, clearTimeout, console, Element: FakeElement, XMLHttpRequest: FakeXHR };
  ctx.window = ctx; ctx.Promise = undefined; ctx.Set = undefined; ctx.Map = undefined; ctx.Symbol = undefined; ctx.URL = undefined; ctx.AbortController = undefined; ctx.fetch = undefined; ctx.location = { href: 'https://example.test/app/index.html' };
  vm.createContext(ctx);
  vm.runInContext('Array.prototype.find=undefined; Array.prototype.includes=undefined; String.prototype.includes=undefined; String.prototype.padStart=undefined; Object.entries=undefined; Object.assign=undefined;', ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../app/src/main/assets/cilda/compat.js', 'utf8'), ctx);
  const set = new ctx.Set(['a', 'b', 'a']);
  assert.strictEqual(set.size, 2); assert.strictEqual(set.length, 2); assert.strictEqual(set[0], 'a'); assert.strictEqual(set[1], 'b');
  let third = null; set.forEach(function(v, key, collection){ if(v==='a') third=collection; }); assert.strictEqual(third, set);
  set.add('c'); assert.strictEqual(set[2], 'c'); assert.strictEqual(set.has('c'), true);
  const spread = []; for (let i = 0; i < set.length; i++) spread.push(set[i]); assert.deepStrictEqual(spread, ['a', 'b', 'c']);
  const map = new ctx.Map([[1, 'one'], [2, 'two']]); assert.strictEqual(map.size, 2); assert.strictEqual(map.get(2), 'two'); map.set(1, 'updated'); assert.strictEqual(map.get(1), 'updated');
  assert.strictEqual(vm.runInContext("'7'.padStart(3, '0')", ctx), '007');
  assert.strictEqual(vm.runInContext("new URL('https://example.test/x').href", ctx), 'https://example.test/x');
  assert.strictEqual(vm.runInContext("new URL('/x', location.href).href", ctx), 'https://example.test/x');
  assert.strictEqual(vm.runInContext("[1, 2].find(function(v){return v===2;})", ctx), 2);
  assert.strictEqual(vm.runInContext("[1, 2].includes(1)", ctx), true);
  assert.strictEqual(vm.runInContext("'abc'.includes('b')", ctx), true);
  assert.strictEqual(vm.runInContext("Object.entries({a: 1}).length", ctx), 1);
  assert.strictEqual(vm.runInContext("Object.assign({a: 1}, {b: 2}).b", ctx), 2);
  const parent = new ctx.Element(); parent.action = true; const child = new ctx.Element(); child.parentNode = parent; child.parentElement = parent;
  assert.strictEqual(child.closest('[data-a]'), parent);
  const promiseValue = await ctx.Promise.resolve(40).then(v => v + 2); assert.strictEqual(promiseValue, 42);
  const json = await ctx.fetch('/mock', {method: 'GET'}).then(r => r.json()); assert.strictEqual(json.ok, true);
  const controller = new ctx.AbortController(); controller.abort(); assert.strictEqual(controller.signal.aborted, true);
  console.log('Android 4.4 compatibility checks passed.');
}
run().catch(e => { console.error(e); process.exit(1); });
