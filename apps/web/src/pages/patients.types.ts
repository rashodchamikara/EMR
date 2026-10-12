export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'DECEASED';
export type PatientSex = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
export interface FacilityOption { id: string; name: string; code: string; status: string }
export interface Contact { name: string; phone: string; relationship: string | null; alternatePhone: string | null; isPrimary: boolean }
export interface PatientInput {
  firstName: string; middleName: string | null; lastName: string; dateOfBirth: string | null; sex: PatientSex | null;
  nationalIdType: string | null; nationalIdNumber: string | null; phone: string | null; alternatePhone: string | null;
  email: string | null; addressLine1: string | null; addressLine2: string | null; city: string | null;
  stateProvince: string | null; postalCode: string | null; country: string | null; bloodGroup: string | null;
  status: PatientStatus; facilityIds: string[]; primaryFacilityId: string | null; emergencyContacts: Contact[];
}
export interface PatientSummary {
  id: string; medicalRecordNumber: string; firstName: string; middleName: string | null; lastName: string;
  dateOfBirth: string | null; sex: PatientSex | null; phone: string | null; status: PatientStatus;
}
export interface Patient extends Omit<PatientInput, 'facilityIds' | 'primaryFacilityId'> {
  id: string; medicalRecordNumber: string; createdAt: string; updatedAt: string;
  facilities: { facilityId: string; isPrimary: boolean; facility: FacilityOption }[];
}
export interface PatientList { data: PatientSummary[]; meta: { page: number; limit: number; total: number; totalPages: number } }
export function emptyPatient(): PatientInput {
  return { firstName: '', middleName: null, lastName: '', dateOfBirth: null, sex: null, nationalIdType: null,
    nationalIdNumber: null, phone: null, alternatePhone: null, email: null, addressLine1: null, addressLine2: null,
    city: null, stateProvince: null, postalCode: null, country: null, bloodGroup: null, status: 'ACTIVE',
    facilityIds: [], primaryFacilityId: null, emergencyContacts: [] };
}
export function toInput(p: Patient): PatientInput {
  return {
    firstName: p.firstName, middleName: p.middleName, lastName: p.lastName,
    dateOfBirth: p.dateOfBirth?.slice(0, 10) ?? null, sex: p.sex,
    nationalIdType: p.nationalIdType, nationalIdNumber: p.nationalIdNumber,
    phone: p.phone, alternatePhone: p.alternatePhone, email: p.email,
    addressLine1: p.addressLine1, addressLine2: p.addressLine2, city: p.city,
    stateProvince: p.stateProvince, postalCode: p.postalCode, country: p.country,
    bloodGroup: p.bloodGroup, status: p.status,
    facilityIds: p.facilities.map((f) => f.facilityId),
    primaryFacilityId: p.facilities.find((f) => f.isPrimary)?.facilityId ?? null,
    emergencyContacts: p.emergencyContacts.map((c) => ({ name: c.name, phone: c.phone, relationship: c.relationship, alternatePhone: c.alternatePhone, isPrimary: c.isPrimary })),
  };
}
