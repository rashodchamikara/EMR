import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { apiJson } from '../api/api-client';
import { useAuth } from '../auth/useAuth';
import { PatientEditor } from './PatientEditor';
import type { FacilityOption, Patient, PatientList } from './patients.types';
import './patients.css';

export function PatientsPage() {
  const { user } = useAuth();
  if (!user?.organizationId) return <section className="patients"><h1>Patients</h1><p>Select an organization in the top bar to continue.</p></section>;
  if (!user.permissions.includes('patients.read')) return <section className="patients"><h1>Patients</h1><p>You do not have permission to view patients.</p></section>;
  // Organization changes remount the registry so records and unfinished forms cannot cross organizations.
  return <PatientRegistry key={user.organizationId} organizationId={user.organizationId} canCreate={user.permissions.includes('patients.create')} canUpdate={user.permissions.includes('patients.update')} />;
}
function PatientRegistry({ organizationId, canCreate, canUpdate }: { organizationId: string; canCreate: boolean; canUpdate: boolean }) {
  const base = `/organizations/${organizationId}/patients`;
  const [search, setSearch] = useState(''); const [applied, setApplied] = useState('');
  const [status, setStatus] = useState(''); const [facilityId, setFacilityId] = useState('');
  const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<PatientList | null>(null); const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [optionsError, setOptionsError] = useState(''); const [optionsReady, setOptionsReady] = useState(false);
  const [selected, setSelected] = useState<Patient | 'new' | null>(null); const [editing, setEditing] = useState(false);
  const [opening, setOpening] = useState(false); const openVersion = useRef(0);
  useEffect(() => { const controller = new AbortController();
    void apiJson<FacilityOption[]>(`${base}/facility-options`, { signal: controller.signal }).then((data) => { setFacilities(data); setOptionsReady(true); setOptionsError(''); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setOptionsError(message(e)); });
    return () => { controller.abort(); openVersion.current++; };
  }, [base, refresh]);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError('');
    const query = new URLSearchParams({ page: String(page), limit: '20' });
    if (applied) query.set('search', applied); if (status) query.set('status', status); if (facilityId) query.set('facilityId', facilityId);
    void apiJson<PatientList>(`${base}?${query}`, { signal: controller.signal }).then((data) => { if (!controller.signal.aborted) setList(data); })
      .catch((e: unknown) => { if (!controller.signal.aborted) { setList(null); setError(message(e)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, page, applied, status, facilityId, refresh]);
  async function open(id: string) {
    const version = ++openVersion.current; setOpening(true); setError(''); setNotice('');
    try { const patient = await apiJson<Patient>(`${base}/${id}`); if (version === openVersion.current) { setSelected(patient); setEditing(false); } }
    catch (e) { if (version === openVersion.current) setError(message(e)); }
    finally { if (version === openVersion.current) setOpening(false); }
  }
  function submitSearch(event: FormEvent) { event.preventDefault(); setPage(1); setApplied(search.trim()); }
  return <section className="patients">
    <header className="patients-heading"><div><h1>Patient registry</h1><p>Registration and demographics for the selected organization.</p></div>
      {canCreate && <button disabled={!optionsReady || opening || selected !== null} onClick={() => { setSelected('new'); setEditing(true); setNotice(''); }}>+ Register patient</button>}
    </header>
    {notice && <p className="patients-success" role="status">{notice}</p>}
    {optionsError && <p className="patients-error" role="alert">Facility options: {optionsError} <button onClick={() => setRefresh((v) => v + 1)}>Retry</button></p>}
    {selected !== null && <PatientEditor key={selected === 'new' ? 'new' : selected.id + selected.updatedAt} base={base} patient={selected === 'new' ? null : selected} facilities={facilities} editing={editing} canUpdate={canUpdate && optionsReady} onEdit={() => setEditing(true)} onClose={() => setSelected(null)} onSaved={(patient) => { setSelected(patient); setEditing(false); setRefresh((v) => v + 1); setNotice(`Saved ${patient.medicalRecordNumber}.`); }} />}
    <div className="patients-panel">
      <form className="patients-filters" onSubmit={submitSearch}>
        <label>Search<input value={search} maxLength={100} placeholder="Name, MRN, phone or identity number" onChange={(e) => setSearch(e.target.value)} /></label>
        <label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['ACTIVE', 'INACTIVE', 'DECEASED'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Facility<select value={facilityId} onChange={(e) => { setFacilityId(e.target.value); setPage(1); }}><option value="">All facilities</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <button type="submit">Search</button><button type="button" className="secondary" onClick={() => { setSearch(''); setApplied(''); setStatus(''); setFacilityId(''); setPage(1); }}>Clear</button>
        <button type="button" className="secondary" onClick={() => setRefresh((v) => v + 1)}>Refresh</button>
      </form>
      {error && <p className="patients-error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading patients…</p> : list && <>
        <p>{list.meta.total} matching patient{list.meta.total !== 1 ? 's' : ''}</p>
        <div className="patients-table"><table><thead><tr><th>Patient / MRN</th><th>Date of birth</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {list.data.map((p) => <tr key={p.id}><td><strong>{[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}</strong><br /><small>{p.medicalRecordNumber}</small></td><td>{p.dateOfBirth?.slice(0, 10) ?? '—'}</td><td>{p.phone ?? '—'}</td><td><span className={`patient-status ${p.status.toLowerCase()}`}>{p.status}</span></td><td><button className="secondary" disabled={opening || selected !== null} onClick={() => { void open(p.id); }}>View</button></td></tr>)}
          {!list.data.length && <tr><td colSpan={5}>No patients found. Adjust the filters or register a patient.</td></tr>}
        </tbody></table></div>
        <footer className="patients-pagination"><button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {Math.max(1, list.meta.totalPages)}</span><button className="secondary" disabled={page >= list.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button></footer>
      </>}
    </div>
  </section>;
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Request failed. Please try again.'; }
