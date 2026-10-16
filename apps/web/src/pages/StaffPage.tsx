import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { apiJson } from '../api/api-client';
import { useAuth } from '../auth/useAuth';
import { StaffAssignments } from './StaffAssignments';
import type { Page, StaffMember, StaffRole } from './workforce-api';
import './workforce.css';

export function StaffPage() {
  const { user } = useAuth();
  if (!user?.organizationId) return <p>Select an organization to manage staff.</p>;
  if (!user.permissions.includes('staff.read')) return <p>You do not have permission to view staff.</p>;
  return <StaffDirectory key={user.organizationId} organizationId={user.organizationId} userId={user.userId} permissions={user.permissions} systemAdmin={user.roles.includes('SYSTEM_ADMIN')} />;
}
function StaffDirectory({ organizationId, userId, permissions, systemAdmin }: { organizationId: string; userId: string; permissions: string[]; systemAdmin: boolean }) {
  const base = `/organizations/${organizationId}/memberships`;
  const canRole = permissions.includes('roles.assign');
  const canCreate = canRole && permissions.includes('staff.create');
  const canUpdate = permissions.includes('staff.update');
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [term, setTerm] = useState(''); const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0); const [assignmentRevision, setAssignmentRevision] = useState(0); const [data, setData] = useState<Page<StaffMember> | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [roleError, setRoleError] = useState(''); const [notice, setNotice] = useState('');
  const [mode, setMode] = useState<'create' | 'link' | 'edit' | null>(null); const [selected, setSelected] = useState<StaffMember | null>(null);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError('');
    const query = new URLSearchParams({ page: String(page), limit: '20', ...(term ? { search: term } : {}), ...(status ? { status } : {}) });
    void apiJson<Page<StaffMember>>(`${base}?${query}`, { signal: controller.signal }).then((r) => { if (!controller.signal.aborted) setData(r); })
      .catch((e: unknown) => { if (!controller.signal.aborted) { setError(message(e)); setData(null); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, page, term, status, revision]);
  useEffect(() => { if (!canRole) return; const controller = new AbortController();
    void apiJson<StaffRole[]>(`${base}/roles`, { signal: controller.signal }).then((r) => { setRoles(r); setRoleError(''); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setRoleError(message(e)); });
    return () => controller.abort();
  }, [base, canRole, revision]);
  function close() { setMode(null); setSelected(null); }
  return <>
    <section className="workforce">
      <header><div><h1>Staff directory</h1><p>Create staff accounts here, then assign facilities below. Clinical staff can also have a practitioner profile.</p></div>
      <div className="wf-actions">{canCreate && <button disabled={mode !== null || !roles.length} onClick={() => { setSelected(null); setMode('create'); setNotice(''); }}>+ Create staff</button>}
      {canCreate && systemAdmin && <button className="secondary" disabled={mode !== null || !roles.length} onClick={() => { setSelected(null); setMode('link'); }}>Link existing account</button>}</div></header>
      {notice && <p className="wf-success" role="status">{notice}</p>}
      {roleError && <p className="wf-error" role="alert">Roles: {roleError}</p>}
      {mode && <StaffForm key={mode + (selected?.id ?? '')} mode={mode} member={selected} base={base} roles={roles} canRole={canRole} self={selected?.userId === userId} onClose={close} onSaved={(member) => { close(); setNotice(`${member.user.firstName} ${member.user.lastName} saved. Facility assignments are managed below; clinical profiles are managed in Practitioners.`); setRevision((v) => v + 1); setAssignmentRevision((v) => v + 1); }} />}
      <form className="wf-actions" onSubmit={(e) => { e.preventDefault(); setTerm(search.trim()); setPage(1); }}>
        <label>Search staff<input value={search} maxLength={150} placeholder="First name, last name or email" onChange={(e) => setSearch(e.target.value)} /></label>
        <label>Membership status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['ACTIVE','SUSPENDED','REMOVED'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <button>Search</button><button type="button" className="secondary" onClick={() => { setSearch(''); setTerm(''); setStatus(''); setPage(1); }}>Clear</button><button type="button" className="secondary" onClick={() => setRevision((v) => v + 1)}>Refresh</button>
      </form>
      {error && <p className="wf-error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading staff…</p> : data && <><div className="wf-table"><table><thead><tr><th>Staff member</th><th>Roles / job title</th><th>Membership</th><th>Facilities</th><th>Practitioner</th><th>Action</th></tr></thead><tbody>
        {data.data.map((m) => <tr key={m.id}><td><strong>{m.user.firstName} {m.user.lastName}</strong><br />{m.user.email}<br /><small>Account: {m.user.status}</small></td><td>{m.roles.map((r) => r.role.name).join(', ') || 'No role'}<br /><small>{m.jobTitle}</small></td><td>{m.status}</td><td>{m.facilityAssignments.filter((a) => a.status === 'ACTIVE').map((a) => a.facility.name + (a.isPrimary ? ' (primary)' : '')).join(', ') || 'Unassigned'}</td><td>{m.practitioner ? `${m.practitioner.type} / ${m.practitioner.status}` : 'Not created'}{permissions.includes('practitioners.read') && <><br /><Link to="/administration/practitioners">Open Practitioners</Link></>}</td><td>{canUpdate && <button className="secondary" disabled={mode !== null} onClick={() => { setSelected(m); setMode('edit'); }}>Edit membership</button>}</td></tr>)}
        {!data.data.length && <tr><td colSpan={6}>No staff found. Use Create staff to add the first person.</td></tr>}
      </tbody></table></div><footer><span>{data.meta.total} staff · Page {page} of {Math.max(1, data.meta.totalPages)}</span><div className="wf-actions"><button className="secondary" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button><button className="secondary" disabled={page >= data.meta.totalPages} onClick={() => setPage((v) => v + 1)}>Next</button></div></footer></>}
    </section>
    <StaffAssignments key={assignmentRevision} onChanged={() => setRevision((v) => v + 1)} />
  </>;
}
function StaffForm({ mode, member, base, roles, canRole, self, onClose, onSaved }: { mode: 'create' | 'link' | 'edit'; member: StaffMember | null; base: string; roles: StaffRole[]; canRole: boolean; self: boolean; onClose: () => void; onSaved: (member: StaffMember) => void }) {
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState(member?.jobTitle ?? ''); const [status, setStatus] = useState(member?.status ?? 'ACTIVE');
  const [codes, setCodes] = useState<string[]>(member?.roles.map((r) => r.role.code) ?? []);
  const [busy, setBusy] = useState(false); const lock = useRef(false); const [error, setError] = useState('');
  const edit = mode === 'edit'; const roleChanged = codes.slice().sort().join('|') !== (member?.roles.map((r) => r.role.code).sort().join('|') ?? '');
  const roleOptions = [...roles, ...(member?.roles.map((r) => r.role).filter((r) => !roles.some((a) => a.code === r.code)) ?? [])];
  function close() { if (window.confirm('Discard changes and close this form?')) onClose(); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current) return; setError('');
    if ((!edit || roleChanged) && !codes.length) { setError('Choose at least one role.'); return; }
    const payload = edit ? { jobTitle: jobTitle || null, ...(status !== member?.status ? { status } : {}), ...(roleChanged ? { roleCodes: codes } : {}) }
      : { email, jobTitle: jobTitle || null, roleCodes: codes, ...(mode === 'create' ? { firstName, lastName, password } : {}) };
    lock.current = true; setBusy(true);
    try { const result = await apiJson<StaffMember>(edit ? `${base}/${member!.id}` : mode === 'link' ? `${base}/link-existing` : base, { method: edit ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); setPassword(''); onSaved(result); }
    catch (e) { setError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form className="wf-form" onSubmit={(e) => { void submit(e); }}>
    <h2>{edit ? `Edit membership — ${member?.user.firstName} ${member?.user.lastName}` : mode === 'link' ? 'Link an existing account' : 'Create staff account'}</h2>
    {error && <p className="wf-error" role="alert">{error}</p>}
    {edit ? <p>{member?.user.email} · Changes apply to this organization's membership. Shared account names and credentials are not edited here.</p> : <p>{mode === 'link' ? 'Link by the existing email. The account password and profile stay unchanged.' : 'Creates a login account and organization membership together. No email is sent. Use a unique initial password and share it through your usual secure process.'}</p>}
    <fieldset disabled={busy}><div className="wf-grid">
      {mode === 'create' && <><label>First name *<input required maxLength={100} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label><label>Last name *<input required maxLength={100} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label></>}
      {!edit && <label>Email *<input type="email" required maxLength={254} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
      {mode === 'create' && <label>Initial password *<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /><small>12–128 characters. No automatic reset or invitation email.</small></label>}
      <label>Job title<input maxLength={150} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></label>
      {edit && <label>Membership status<select value={status} disabled={self} onChange={(e) => setStatus(e.target.value as typeof status)}>{['ACTIVE','SUSPENDED','REMOVED'].map((s) => <option key={s}>{s}</option>)}</select></label>}
    </div><p>Organization roles *</p><div className="wf-actions">{roleOptions.map((r) => <label className="wf-check" key={r.code}><input type="checkbox" checked={codes.includes(r.code)} disabled={!canRole || self || !roles.some((a) => a.code === r.code)} onChange={(e) => setCodes((previous) => e.target.checked ? [...previous, r.code] : previous.filter((c) => c !== r.code))} />{r.name}</label>)}</div>
    {!roleOptions.length && <p>No assignable roles. Run the existing seed and sign in again.</p>}
    {edit && <p>Changing roles or membership status signs this user out. Suspending/removing membership also suspends their facility assignments and practitioner profile. Reactivating membership does not automatically reactivate those records.</p>}
    {self && <p>Another administrator must change your own roles or membership status.</p>}
    <div className="wf-actions"><button disabled={busy}>{busy ? 'Saving…' : edit ? 'Save membership' : mode === 'link' ? 'Link account' : 'Create staff'}</button><button type="button" className="secondary" onClick={close}>Cancel</button></div></fieldset>
  </form>;
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Request failed. Please try again.'; }
