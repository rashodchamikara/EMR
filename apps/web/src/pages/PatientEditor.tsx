import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { apiJson } from '../api/api-client';
import { emptyPatient, toInput } from './patients.types';
import type { Contact, FacilityOption, Patient, PatientInput } from './patients.types';

type Props = { base: string; patient: Patient | null; facilities: FacilityOption[]; editing: boolean; canUpdate: boolean; onEdit: () => void; onClose: () => void; onSaved: (patient: Patient) => void };
const fields = [
  ['firstName', 'First name', 100, 'text', true], ['middleName', 'Middle name', 100, 'text', false], ['lastName', 'Last name', 100, 'text', true],
  ['dateOfBirth', 'Date of birth', 10, 'date', false], ['nationalIdType', 'Identity type (e.g. NIC / Passport)', 30, 'text', false], ['nationalIdNumber', 'Identity number', 100, 'text', false],
  ['phone', 'Phone', 50, 'tel', false], ['alternatePhone', 'Alternate phone', 50, 'tel', false], ['email', 'Email', 190, 'email', false],
  ['addressLine1', 'Address line 1', 190, 'text', false], ['addressLine2', 'Address line 2', 190, 'text', false], ['city', 'City', 100, 'text', false],
  ['stateProvince', 'State / Province', 100, 'text', false], ['postalCode', 'Postal code', 30, 'text', false], ['country', 'Country', 100, 'text', false],
] as const;
export function PatientEditor({ base, patient, facilities, editing, canUpdate, onEdit, onClose, onSaved }: Props) {
  const [form, setForm] = useState<PatientInput>(() => patient ? toInput(patient) : emptyPatient());
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const saving = useRef(false);
  const readOnly = !editing; const originalFacilities = patient?.facilities.map((f) => f.facilityId) ?? [];
  function change<K extends keyof PatientInput>(key: K, value: PatientInput[K]) { setForm((previous) => ({ ...previous, [key]: value })); }
  function contact(index: number, key: keyof Contact, value: string) { setForm((previous) => ({ ...previous, emergencyContacts: previous.emergencyContacts.map((c, i) => i === index ? { ...c, [key]: key === 'name' || key === 'phone' ? value : value || null } : c) })); }
  function toggleFacility(id: string) { setForm((previous) => {
    const ids = previous.facilityIds.includes(id) ? previous.facilityIds.filter((f) => f !== id) : [...previous.facilityIds, id];
    return { ...previous, facilityIds: ids, primaryFacilityId: previous.primaryFacilityId && ids.includes(previous.primaryFacilityId) ? previous.primaryFacilityId : ids[0] ?? null };
  }); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving.current || readOnly) return;
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return; }
    if (Boolean(form.nationalIdType?.trim()) !== Boolean(form.nationalIdNumber?.trim())) { setError('Enter both identity type and number, or leave both blank.'); return; }
    saving.current = true; setBusy(true); setError('');
    const payload = { ...form, ...(patient ? { expectedUpdatedAt: patient.updatedAt } : {}) };
    try { const result = await apiJson<Patient>(patient ? `${base}/${patient.id}` : base, { method: patient ? 'PUT' : 'POST', body: JSON.stringify(payload) }); onSaved(result); }
    catch (e) { setError((e instanceof Error ? e.message : 'Unable to save.') + (!patient ? ' If the connection was interrupted, search the registry before submitting again.' : '')); }
    finally { saving.current = false; setBusy(false); }
  }
  function close() { if (!editing || window.confirm('Discard this form and close?')) onClose(); }
  return <section className="patients-panel patient-editor" aria-label="Patient details">
    <header className="patients-heading"><div><h2>{patient ? `${patient.firstName} ${patient.lastName}` : 'Register patient'}</h2><p>{patient ? `${patient.medicalRecordNumber} · Updated ${new Date(patient.updatedAt).toLocaleString()}` : 'The medical record number is assigned when you save.'}</p></div>
      <div className="patients-actions">{readOnly && canUpdate && <button onClick={onEdit}>Edit patient</button>}<button className="secondary" disabled={busy} onClick={close}>Close</button></div>
    </header>
    {error && <p className="patients-error" role="alert">{error}</p>}
    <form onSubmit={(e) => { void save(e); }}>
      <fieldset disabled={readOnly || busy}><legend>Demographics and contact details</legend><div className="patients-grid">
        {fields.map(([key, label, maxLength, type, required]) => <label key={key}>{label}{required ? ' *' : ''}<input type={type} value={form[key] ?? ''} required={required} maxLength={maxLength} max={type === 'date' ? new Date().toISOString().slice(0, 10) : undefined} onChange={(e) => change(key, required ? e.target.value : e.target.value || null)} /></label>)}
        <label>Sex<select value={form.sex ?? ''} onChange={(e) => change('sex', (e.target.value || null) as PatientInput['sex'])}><option value="">Not recorded</option>{['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Blood group (reported)<select value={form.bloodGroup ?? ''} onChange={(e) => change('bloodGroup', e.target.value || null)}><option value="">Not recorded</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={(e) => change('status', e.target.value as PatientInput['status'])}>{['ACTIVE', 'INACTIVE', 'DECEASED'].map((s) => <option key={s}>{s}</option>)}</select></label>
      </div></fieldset>
      <fieldset disabled={readOnly || busy}><legend>Facility registration</legend><p>A patient may have multiple facility links. Choose one primary facility, or leave all unselected.</p>
        <div className="patients-facilities">{facilities.map((f) => <label className="patient-check" key={f.id}><input type="checkbox" checked={form.facilityIds.includes(f.id)} disabled={f.status !== 'ACTIVE' && !originalFacilities.includes(f.id)} onChange={() => toggleFacility(f.id)} />{f.name} ({f.code}){f.status !== 'ACTIVE' ? ` — ${f.status}` : ''}</label>)}</div>
        {!facilities.length && <p>No facilities are available. You can register without a facility.</p>}
        <label>Primary facility<select value={form.primaryFacilityId ?? ''} disabled={!form.facilityIds.length} onChange={(e) => change('primaryFacilityId', e.target.value || null)}><option value="">None</option>{facilities.filter((f) => form.facilityIds.includes(f.id)).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      </fieldset>
      <fieldset disabled={readOnly || busy}><legend>Emergency contacts</legend>
        {!form.emergencyContacts.length && <p>No emergency contacts recorded.</p>}
        {form.emergencyContacts.map((c, index) => <div className="patient-contact" key={index}><div className="patients-grid">
          <label>Name *<input required maxLength={150} value={c.name} onChange={(e) => contact(index, 'name', e.target.value)} /></label>
          <label>Relationship<input maxLength={100} value={c.relationship ?? ''} onChange={(e) => contact(index, 'relationship', e.target.value)} /></label>
          <label>Phone *<input required type="tel" maxLength={50} value={c.phone} onChange={(e) => contact(index, 'phone', e.target.value)} /></label>
          <label>Alternate phone<input type="tel" maxLength={50} value={c.alternatePhone ?? ''} onChange={(e) => contact(index, 'alternatePhone', e.target.value)} /></label>
        </div><div className="patients-actions"><label className="patient-check"><input type="radio" name="primaryContact" checked={c.isPrimary} onChange={() => change('emergencyContacts', form.emergencyContacts.map((item, i) => ({ ...item, isPrimary: i === index })))} />Primary contact</label>
          {!readOnly && <button className="secondary" type="button" onClick={() => { const remaining = form.emergencyContacts.filter((_c, i) => i !== index); if (remaining.length && !remaining.some((item) => item.isPrimary)) remaining[0] = { ...remaining[0], isPrimary: true }; change('emergencyContacts', remaining); }}>Remove</button>}
        </div></div>)}
        {!readOnly && <button type="button" className="secondary" disabled={form.emergencyContacts.length >= 10} onClick={() => change('emergencyContacts', [...form.emergencyContacts, { name: '', relationship: null, phone: '', alternatePhone: null, isPrimary: form.emergencyContacts.length === 0 }])}>+ Add emergency contact</button>}
      </fieldset>
      {!readOnly && <div className="patients-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : patient ? 'Save changes' : 'Register patient'}</button><button type="button" className="secondary" disabled={busy} onClick={close}>Cancel</button><span>* Required fields</span></div>}
    </form>
  </section>;
}
