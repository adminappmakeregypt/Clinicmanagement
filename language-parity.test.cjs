const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function clinic(language) {
  const document = { documentElement: { setAttribute() {} }, addEventListener() {}, dispatchEvent() {}, readyState: 'loading' };
  const window = { clinicKey: x => x, alert() {}, confirm() {}, prompt() {} };
  const sandbox = { window, document, Event: function() {}, location: { reload() {} }, localStorage: { getItem: k => k === 'cm_lang' ? language : null, setItem() {} } };
  for (const name of ['i18n.js', 'specialties.js', 'specialties-extra.js', 'dental-odo.js', 'dental.js', 'dental-plus.js']) {
    vm.runInNewContext(fs.readFileSync(__dirname + '/' + name, 'utf8'), sandbox);
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
