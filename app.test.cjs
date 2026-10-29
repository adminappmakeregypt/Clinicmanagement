// Merged from dental-notation.test.cjs + language-parity.test.cjs. Run: node --test app.test.cjs
// Reads one original part out of specialties-bundle.js (or a standalone file) so tests run exactly as before.
const fs0 = require('node:fs');
function part(name) {
  if (fs0.existsSync(__dirname + '/' + name)) return fs0.readFileSync(__dirname + '/' + name, 'utf8');
  const s = fs0.readFileSync(__dirname + '/specialties-bundle.js', 'utf8');
  const i = s.indexOf('/* ==== BEGIN ' + name + ' ==== */'), j = s.indexOf('/* ==== END ' + name + ' ==== */');
  if (i < 0 || j < 0) throw new Error('part not found: ' + name);
  return s.slice(i, j);
}

// ---- dental notation ----
{
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sandbox={window:{ClinicSpecialty:{escape:String}}};
vm.runInNewContext(part('dental-odo.js'),sandbox);
const api=sandbox.window.ClinicDentalOdo;
for(const [q,corner,side] of [[5,'┘','UR'],[6,'└','UL'],[7,'┌','LL'],[8,'┐','LR']]){
 test('Primary '+side+' uses A–E and '+corner,()=>{
  for(let p=1;p<=5;p++){
   const n=String(q)+p,t=api.toothNotation(n),letter='ABCDE'[p-1];
   assert.equal(t.letter,letter); assert.equal(t.corner,corner); assert.equal(t.quadrant,side);
   assert.equal(t.text,(q===5||q===8)?letter+corner:corner+letter);
  }
 });
}
test('Permanent teeth retain FDI identifiers',()=>{for(const n of api.teethOf('permanent')) assert.equal(api.toothNotation(n).text,n);});
test('Primary and mixed tooth keys remain FDI',()=>{
 assert.deepEqual(Array.from(api.teethOf('primary')),['55','54','53','52','51','61','62','63','64','65','85','84','83','82','81','71','72','73','74','75']);
 assert.equal(api.teethOf('mixed').length,52);
});

}

// ---- language parity (needs specialties.js, which is not in this zip) ----
{
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function clinic(language) {
  const document = { documentElement: { setAttribute() {} }, addEventListener() {}, dispatchEvent() {}, readyState: 'loading' };
  const window = { clinicKey: x => x, alert() {}, confirm() {}, prompt() {} };
  const sandbox = { window, document, Event: function() {}, location: { reload() {} }, localStorage: { getItem: k => k === 'cm_lang' ? language : null, setItem() {} } };
  for (const name of ['i18n.js', 'specialties.js', 'specialties-extra.js', 'dental-odo.js', 'dental.js', 'dental-plus.js']) {
    vm.runInNewContext(part(name), sandbox);
  }
  return window;
}
test('Changing language preserves the same specialty identifiers and dental record keys', () => {
  const ar = clinic('ar'), en = clinic('en');
  assert.deepEqual(JSON.parse(JSON.stringify(en.ClinicSpecialty.list())), JSON.parse(JSON.stringify(ar.ClinicSpecialty.list())));
  const values = { fields: { hygiene: 'جيدة', chief: 'اختبار' }, sections: { endo: [{ tooth: '26', finalRestoration: 'اختبار', periapical: 'اختبار' }], implants: [{ tooth: '26', cbct: 'اختبار' }] } };
  assert.equal(en.ClinicSpecialty.formHtml(values, 'dental'), ar.ClinicSpecialty.formHtml(values, 'dental'));
  const root = { querySelector(selector) { return selector === '.sp-form' ? { querySelectorAll() { return [{ dataset: { k: 'hygiene' }, value: 'جيدة' }, { dataset: { k: 'chief' }, value: 'اختبار' }]; } } : null; } };
  const saved = en.ClinicSpecialty.collect(root, 'dental');
  assert.equal(saved.fields.hygiene, 'جيدة');
  assert.equal(saved.fields.chief, 'اختبار');
  assert.equal(saved.specialty, 'dental');
});

}

// ---- v70 specialties: registered once, matched by free text, English complete ----
{
  const { test } = require('node:test');
  const assert = require('node:assert/strict');
  const vm = require('node:vm');
  const fs = require('node:fs');
  const NEW = ['urology', 'cardiology', 'neurology', 'chest', 'endocrine', 'surgery', 'physio', 'psychiatry'];
  function load() {
    const document = { documentElement: { setAttribute() {} }, addEventListener() {}, dispatchEvent() {}, getElementById() { return null; }, readyState: 'loading' };
    const window = { clinicKey: x => x };
    const sandbox = { window, document, Event: function () {}, localStorage: { getItem: () => null, setItem() {} }, console };
    for (const f of ['specialties.js', 'specialties-extra.js']) vm.runInNewContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), sandbox);
    return window.ClinicSpecialty;
  }
  test('v70 specialties are registered and old ids are unchanged', () => {
    const ids = load().list().map(x => x.id);
    for (const id of ['general', 'dental', 'ophthalmology', 'pediatrics', 'dermatology', 'orthopedics', 'obgyn', 'ent', 'aesthetic', 'gastro', 'internal', ...NEW]) assert.ok(ids.includes(id), id);
    assert.equal(new Set(ids).size, ids.length);
  });
  test('free-text specialty names map to the new ids', () => {
    const SP = load();
    const cases = { 'مسالك بولية': 'urology', 'قلب وأوعية دموية': 'cardiology', 'مخ وأعصاب': 'neurology', 'صدر': 'chest', 'سكر وغدد صماء': 'endocrine',
      'جراحة عامة': 'surgery', 'علاج طبيعي': 'physio', 'أمراض نفسية': 'psychiatry', 'Urologist': 'urology', 'Cardiology': 'cardiology', 'Psychiatrist': 'psychiatry' };
    for (const [txt, id] of Object.entries(cases)) assert.equal(SP.matchText(txt)[0], id, txt);
    assert.equal(SP.matchText('أسنان')[0], 'dental');
    assert.equal(SP.matchText('جراحة عظام')[0], 'orthopedics');
  });
  test('English mode leaves no Arabic in the new specialty labels', () => {
    const src = fs.readFileSync(__dirname + '/i18n.js', 'utf8');
    const a = src.indexOf('var DICT'), b = src.indexOf('window.cmT = tr;') + 16;
    const sb = { window: {} };
    vm.runInNewContext('(function(){var lang="en";' + src.slice(a, b) + '})()', sb);
    const SP = load();
    for (const id of NEW) assert.ok(!/[\u0600-\u06FF]/.test(sb.window.cmT(SP.list().find(x => x.id === id).label)), id);
  });
}
