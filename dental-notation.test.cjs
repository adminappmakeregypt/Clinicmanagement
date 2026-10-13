const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const sandbox={window:{ClinicSpecialty:{escape:String}}};
vm.runInNewContext(fs.readFileSync(__dirname+'/dental-odo.js','utf8'),sandbox);
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
