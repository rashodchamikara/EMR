// Development only: creates one fictional user, membership, practitioner and optionally an assignment.
// Cleanup marks the membership REMOVED, suspending related records; it does not delete the account.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const base = (process.env.EMR_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const token = process.env.EMR_ACCESS_TOKEN;
const org = process.env.EMR_ORGANIZATION_ID;
if (!token || !org) throw new Error('Set EMR_ACCESS_TOKEN and EMR_ORGANIZATION_ID.');
const root = `/organizations/${org}`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function request(path, method='GET', body) {
  const response = await fetch(base+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json()};
}
let member;
try {
  const email = `staff-smoke-${Date.now()}-${randomBytes(3).toString('hex')}@example.invalid`;
  const created = await request(root+'/memberships','POST',{firstName:'WorkforceTest',lastName:'Sample',email,password:randomBytes(24).toString('base64url'),roleCodes:['DOCTOR'],jobTitle:'Test clinician'});
  assert.equal(created.status,201,JSON.stringify(created.data));member=created.data;
  assert.equal(member.status,'ACTIVE');assert.equal(member.user.email,email);
  assert.equal('passwordHash' in member.user,false);console.log('PASS: staff account and membership created; no password hash returned');
  const listed = await request(root+'/memberships?search='+encodeURIComponent(email));
  assert.equal(listed.status,200);assert.ok(listed.data.data.some((m)=>m.id===member.id));console.log('PASS: directory search');
  const eligible=await request(root+'/practitioners/eligible-members?search='+encodeURIComponent(email));
  assert.equal(eligible.status,200);assert.ok(eligible.data.data.some((m)=>m.id===member.id));console.log('PASS: eligible staff available to practitioner screen');
  const facilities=await request(root+'/memberships/facilities');assert.equal(facilities.status,200);
  const facility=facilities.data.find((f)=>f.status==='ACTIVE');
  if(facility){
    const assignment=await request(root+`/facilities/${facility.id}/staff`,'POST',{membershipId:member.id,isPrimary:true});
    assert.equal(assignment.status,201,JSON.stringify(assignment.data));
    const suspended=await request(root+`/facilities/${facility.id}/staff/${assignment.data.id}`,'PATCH',{status:'SUSPENDED'});
    assert.equal(suspended.status,200);assert.equal(suspended.data.isPrimary,false);
    const active=await request(root+`/facilities/${facility.id}/staff/${assignment.data.id}`,'PATCH',{status:'ACTIVE',isPrimary:true});
    assert.equal(active.status,200);assert.equal(active.data.isPrimary,true);console.log('PASS: assign, suspend and activate facility staff');
  }else console.log('SKIP: facility assignment check (no active facility)');
  const profile=await request(root+'/practitioners','POST',{membershipId:member.id,type:'PHYSICIAN',consultationDurationMinutes:15});
  assert.equal(profile.status,201,JSON.stringify(profile.data));
  const duplicate=await request(root+'/practitioners','POST',{membershipId:member.id,type:'PHYSICIAN'});assert.equal(duplicate.status,409);
  const after=await request(root+'/practitioners/eligible-members?search='+encodeURIComponent(email));assert.equal(after.data.meta.total,0);
  console.log('PASS: practitioner created, duplicate blocked, eligible list updated');
  const edited=await request(root+`/practitioners/${profile.data.id}`,'PATCH',{primarySpecialty:'Test specialty',consultationDurationMinutes:30});
  assert.equal(edited.status,200);assert.equal(edited.data.consultationDurationMinutes,30);console.log('PASS: practitioner editing');
  const suspendedMember=await request(root+`/memberships/${member.id}`,'PATCH',{status:'SUSPENDED'});assert.equal(suspendedMember.status,200);
  const suspendedProfile=await request(root+`/practitioners/${profile.data.id}`);assert.equal(suspendedProfile.data.status,'SUSPENDED');
  const denied=await request(root+`/practitioners/${profile.data.id}`,'PATCH',{status:'ACTIVE'});assert.equal(denied.status,400);
  console.log('PASS: suspended membership suspends clinical profile and blocks premature activation');
  console.log('Workforce smoke test passed.');
} finally {
  if(member){const result=await request(root+`/memberships/${member.id}`,'PATCH',{status:'REMOVED'});console.log(result.status===200?'Cleanup: test membership marked REMOVED; test account retained.':'Cleanup failed; remove test membership manually.');}
}
