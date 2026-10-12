// Run on a development database only. Creates two clearly named test patients and marks them INACTIVE.
// Node 20+; use a temporary access token from the login response. Never commit that token.
import assert from 'node:assert/strict';
const base = (process.env.EMR_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const token = process.env.EMR_ACCESS_TOKEN;
const org = process.env.EMR_ORGANIZATION_ID;
if (!token || !org) throw new Error('Set EMR_ACCESS_TOKEN and EMR_ORGANIZATION_ID first.');
const root = `/organizations/${org}/patients`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const created = [];
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json(); return { status: response.status, data };
}
function editable(p) {
  const keys = ['firstName','middleName','lastName','sex','nationalIdType','nationalIdNumber','phone','alternatePhone','email','addressLine1','addressLine2','city','stateProvince','postalCode','country','bloodGroup','status'];
  return { ...Object.fromEntries(keys.map((key) => [key, p[key]])), dateOfBirth: p.dateOfBirth?.slice(0,10) ?? null,
    facilityIds:p.facilities.map((f)=>f.facilityId),primaryFacilityId:p.facilities.find((f)=>f.isPrimary)?.facilityId??null,
    emergencyContacts:p.emergencyContacts.map(({name,phone,relationship,alternatePhone,isPrimary})=>({name,phone,relationship,alternatePhone,isPrimary})),expectedUpdatedAt:p.updatedAt };
}
try {
  const unauth = await fetch(base + root); assert.equal(unauth.status,401); console.log('PASS: authentication required');
  const invalid = await request(root,'POST',{firstName:' ',lastName:'Test',facilityIds:[],emergencyContacts:[]}); assert.equal(invalid.status,400); console.log('PASS: invalid input rejected');
  const run = Date.now().toString();
  for (const i of [1,2]) {
    const response = await request(root,'POST',{firstName:'SprintTest',lastName:`${run}-${i}`,facilityIds:[],emergencyContacts:[],dateOfBirth:'1990-05-15'});
    assert.equal(response.status,201,JSON.stringify(response.data));created.push(response.data);
  }
  assert.notEqual(created[0].medicalRecordNumber,created[1].medicalRecordNumber);console.log('PASS: different automatic MRNs');
  const search = await request(root+'?search='+encodeURIComponent(run));assert.equal(search.status,200);assert.equal(search.data.meta.total,2);console.log('PASS: searchable registrations');
  const p=created[0];const body={...editable(p),phone:'0700000000'};
  const updated=await request(`${root}/${p.id}`,'PUT',body);assert.equal(updated.status,200,JSON.stringify(updated.data));assert.equal(updated.data.phone,'0700000000');assert.equal(updated.data.medicalRecordNumber,p.medicalRecordNumber);console.log('PASS: update preserves MRN');
  const stale=await request(`${root}/${p.id}`,'PUT',body);assert.equal(stale.status,409);console.log('PASS: stale update blocked');
  if(process.env.EMR_FOREIGN_FACILITY_ID) {
    const foreign=await request(root,'POST',{firstName:'MustNotSave',lastName:'ForeignFacility',facilityIds:[process.env.EMR_FOREIGN_FACILITY_ID],primaryFacilityId:process.env.EMR_FOREIGN_FACILITY_ID,emergencyContacts:[]});
    assert.equal(foreign.status,400);console.log('PASS: foreign facility blocked');
  }
  console.log('Smoke checks passed. Complete the frontend and role checks in README.');
} finally {
  for(const p of created) {
    const current=await request(`${root}/${p.id}`);
    if(current.status===200) {
      const result=await request(`${root}/${p.id}`,'PUT',{...editable(current.data),status:'INACTIVE'});
      if(result.status!==200) console.error('Could not deactivate test patient',p.medicalRecordNumber);
    }
  }
  console.log(`Created ${created.length} test patients; cleanup attempted by setting INACTIVE (no deletion).`);
}
