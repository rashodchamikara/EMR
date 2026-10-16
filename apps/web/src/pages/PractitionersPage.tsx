import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FormEvent,
} from 'react';
import { Link } from 'react-router';
import { allPages } from './workforce-api';
import { apiJson } from '../api/api-client';
import { useAuth } from '../auth/useAuth';

type PractitionerType =
  | 'PHYSICIAN'
  | 'DENTIST'
  | 'NURSE'
  | 'MIDWIFE'
  | 'PHARMACIST'
  | 'LAB_TECHNOLOGIST'
  | 'RADIOGRAPHER'
  | 'THERAPIST'
  | 'OTHER';

type PractitionerStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Facility {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: string;
}

interface RoleSummary {
  id: string;
  code: string;
  name: string;
}

interface MembershipRole {
  role: RoleSummary;
}

interface FacilityAssignment {
  id: string;
  facilityId: string;
  isPrimary: boolean;
  status: string;

  facility: {
    id: string;
    code: string;
    name: string;
  };
}

interface OrganizationMembership {
  id: string;
  organizationId: string;
  status: string;
  isPrimary: boolean;
  user: UserSummary;
  roles: MembershipRole[];
}

interface Practitioner {
  id: string;
  organizationId: string;
  membershipId: string;
  type: PractitionerType;
  status: PractitionerStatus;
  title: string | null;
  registrationNumber: string | null;
  registrationAuthority: string | null;
  primarySpecialty: string | null;
  consultationDurationMinutes: number;
  createdAt: string;
  updatedAt: string;

  membership: {
    id: string;
    user: UserSummary;
    roles: MembershipRole[];
    facilityAssignments:
      FacilityAssignment[];
  };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

type CollectionResponse<T> =
  | T[]
  | PaginatedResponse<T>;

const PAGE_SIZE = 20;

const PRACTITIONER_TYPES: Array<{
  value: PractitionerType;
  label: string;
}> = [
  {
    value: 'PHYSICIAN',
    label: 'Physician',
  },
  {
    value: 'DENTIST',
    label: 'Dentist',
  },
  {
    value: 'NURSE',
    label: 'Nurse',
  },
  {
    value: 'MIDWIFE',
    label: 'Midwife',
  },
  {
    value: 'PHARMACIST',
    label: 'Pharmacist',
  },
  {
    value: 'LAB_TECHNOLOGIST',
    label: 'Laboratory Technologist',
  },
  {
    value: 'RADIOGRAPHER',
    label: 'Radiographer',
  },
  {
    value: 'THERAPIST',
    label: 'Therapist',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
];

const PRACTITIONER_STATUSES: Array<{
  value: PractitionerStatus;
  label: string;
}> = [
  {
    value: 'ACTIVE',
    label: 'Active',
  },
  {
    value: 'INACTIVE',
    label: 'Inactive',
  },
  {
    value: 'SUSPENDED',
    label: 'Suspended',
  },
];

export function PractitionersPage() {
  const { user } = useAuth();
  if (!user?.organizationId) return <p>Select an organization to manage practitioners.</p>;
  if (!user.permissions.includes('practitioners.read')) return <p>You do not have permission to view practitioners.</p>;
  return <><p>Create the person's staff account first in <Link to="/administration/staff">Staff</Link>, then select their name below to add clinical details.</p><PractitionersContent key={user.organizationId} /></>;
}
function PractitionersContent() {
  const listRequest = useRef(0);
  const auth = useAuth();

  const organizationId =
    auth.user?.organizationId ?? null;

  const permissions =
    auth.user?.permissions ?? [];

  const canCreatePractitioner =
    permissions.includes(
      'practitioners.create',
    );

  const canUpdatePractitioner =
    permissions.includes(
      'practitioners.update',
    );

  const [facilities, setFacilities] =
    useState<Facility[]>([]);

  const [memberships, setMemberships] =
    useState<OrganizationMembership[]>(
      [],
    );

  const [
    practitioners,
    setPractitioners,
  ] = useState<Practitioner[]>([]);

  const [
    dependenciesLoading,
    setDependenciesLoading,
  ] = useState(false);

  const [
    practitionersLoading,
    setPractitionersLoading,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    pageError,
    setPageError,
  ] = useState<string | null>(null);

  const [
    formError,
    setFormError,
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(null);

  const [
    editingPractitionerId,
    setEditingPractitionerId,
  ] = useState<string | null>(null);

  /*
   * Form values.
   */
  const [
    membershipId,
    setMembershipId,
  ] = useState('');

  const [
    practitionerType,
    setPractitionerType,
  ] = useState<PractitionerType>(
    'PHYSICIAN',
  );

  const [
    practitionerStatus,
    setPractitionerStatus,
  ] = useState<PractitionerStatus>(
    'ACTIVE',
  );

  const [title, setTitle] =
    useState('');

  const [
    registrationNumber,
    setRegistrationNumber,
  ] = useState('');

  const [
    registrationAuthority,
    setRegistrationAuthority,
  ] = useState('');

  const [
    primarySpecialty,
    setPrimarySpecialty,
  ] = useState('');

  const [
    consultationDuration,
    setConsultationDuration,
  ] = useState('15');

  /*
   * List filters.
   */
  const [search, setSearch] =
    useState('');

  const [
    submittedSearch,
    setSubmittedSearch,
  ] = useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<
    PractitionerType | ''
  >('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    PractitionerStatus | ''
  >('');

  const [
    facilityFilter,
    setFacilityFilter,
  ] = useState('');

  const [page, setPage] =
    useState(1);

  const [meta, setMeta] =
    useState<PaginationMeta>({
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    });

  const editingPractitioner =
    useMemo(
      () =>
        practitioners.find(
          (practitioner) =>
            practitioner.id ===
            editingPractitionerId,
        ) ?? null,
      [
        practitioners,
        editingPractitionerId,
      ],
    );

  /**
   * Do not offer a membership that already has a
   * practitioner profile.
   */
  const availableMemberships =
    useMemo(() => {
      const usedMembershipIds =
        new Set(
          practitioners.map(
            (practitioner) =>
              practitioner.membershipId,
          ),
        );

      return memberships.filter(
        (membership) =>
          !usedMembershipIds.has(
            membership.id,
          ),
      );
    }, [
      memberships,
      practitioners,
    ]);

  const loadDependencies =
    useCallback(
      async (): Promise<void> => {
        if (!organizationId) {
          setFacilities([]);
          setMemberships([]);
          return;
        }

        setDependenciesLoading(true);
        setPageError(null);

        try {
          const [
            facilityResponse,
            membershipResponse,
          ] = await Promise.all([
            apiJson<
              CollectionResponse<Facility>
            >(
              `/organizations/${organizationId}/practitioners/facility-options`,
            ),

            allPages<OrganizationMembership>(`/organizations/${organizationId}/practitioners/eligible-members`),
          ]);

          setFacilities(
            extractItems(
              facilityResponse,
            ).filter(
              (facility) =>
                facility.status ===
                'ACTIVE',
            ),
          );

          setMemberships(
            extractItems(
              membershipResponse,
            ).filter(
              (membership) =>
                membership.status ===
                  'ACTIVE' &&
                membership.user.status ===
                  'ACTIVE',
            ),
          );
        } catch (
          requestError: unknown
        ) {
          setFacilities([]);
          setMemberships([]);

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load practitioner dependencies.',
            ),
          );
        } finally {
          setDependenciesLoading(false);
        }
      },
      [organizationId],
    );

  const loadPractitioners =
    useCallback(
      async (): Promise<void> => {
        const requestId = ++listRequest.current;
        if (!organizationId) {
          if (requestId !== listRequest.current) return;
          setPractitioners([]);

          setMeta({
            page: 1,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          });

          return;
        }

        setPractitionersLoading(true);
        setPageError(null);

        try {
          const query =
            new URLSearchParams({
              page: String(page),
              limit: String(
                PAGE_SIZE,
              ),
            });

          if (
            submittedSearch.trim()
          ) {
            query.set(
              'search',
              submittedSearch.trim(),
            );
          }

          if (typeFilter) {
            query.set(
              'type',
              typeFilter,
            );
          }

          if (statusFilter) {
            query.set(
              'status',
              statusFilter,
            );
          }

          if (facilityFilter) {
            query.set(
              'facilityId',
              facilityFilter,
            );
          }

          const response =
            await apiJson<
              CollectionResponse<Practitioner>
            >(
              `/organizations/${organizationId}/practitioners?${query.toString()}`,
            );

          if (requestId !== listRequest.current) return;
          if (
            Array.isArray(response)
          ) {
            setPractitioners(
              response,
            );

            setMeta({
              page: 1,
              limit:
                response.length ||
                PAGE_SIZE,
              total: response.length,
              totalPages:
                response.length > 0
                  ? 1
                  : 0,
            });
          } else {
            setPractitioners(
              Array.isArray(
                response.data,
              )
                ? response.data
                : [],
            );

            setMeta(response.meta);
          }
        } catch (
          requestError: unknown
        ) {
          if (requestId !== listRequest.current) return;
          setPractitioners([]);

          setMeta({
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          });

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load practitioners.',
            ),
          );
        } finally {
          if (requestId === listRequest.current) setPractitionersLoading(false);
        }
      },
      [
        organizationId,
        page,
        submittedSearch,
        typeFilter,
        statusFilter,
        facilityFilter,
      ],
    );

  useEffect(() => {
    setFacilities([]);
    setMemberships([]);
    setPractitioners([]);

    setPage(1);
    setSearch('');
    setSubmittedSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setFacilityFilter('');

    resetForm();

    setPageError(null);
    setSuccessMessage(null);

    void loadDependencies();
  }, [
    organizationId,
    loadDependencies,
  ]);

  useEffect(() => {
    void loadPractitioners();
  }, [loadPractitioners]);

  function resetForm(): void {
    setEditingPractitionerId(null);
    setMembershipId('');

    setPractitionerType(
      'PHYSICIAN',
    );

    setPractitionerStatus(
      'ACTIVE',
    );

    setTitle('');
    setRegistrationNumber('');
    setRegistrationAuthority('');
    setPrimarySpecialty('');
    setConsultationDuration('15');
    setFormError(null);
  }

  const startEditing = (
    practitioner: Practitioner,
  ): void => {
    setEditingPractitionerId(
      practitioner.id,
    );

    setMembershipId(
      practitioner.membershipId,
    );

    setPractitionerType(
      practitioner.type,
    );

    setPractitionerStatus(
      practitioner.status,
    );

    setTitle(
      practitioner.title ?? '',
    );

    setRegistrationNumber(
      practitioner.registrationNumber ??
        '',
    );

    setRegistrationAuthority(
      practitioner.registrationAuthority ??
        '',
    );

    setPrimarySpecialty(
      practitioner.primarySpecialty ??
        '',
    );

    setConsultationDuration(
      String(
        practitioner.consultationDurationMinutes,
      ),
    );

    setFormError(null);
    setSuccessMessage(null);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      event.preventDefault();

      setFormError(null);
      setSuccessMessage(null);

      if (!organizationId) {
        setFormError(
          'Select an active organization first.',
        );

        return;
      }

      if (
        !editingPractitionerId &&
        !membershipId
      ) {
        setFormError(
          'Select an staff member.',
        );

        return;
      }

      const duration =
        Number(
          consultationDuration,
        );

      if (
        !Number.isInteger(duration) ||
        duration < 5 ||
        duration > 480
      ) {
        setFormError(
          'Consultation duration must be a whole number between 5 and 480 minutes.',
        );

        return;
      }

      const normalizedRegistration =
        registrationNumber
          .trim()
          .toUpperCase();

      const requestBody:
        Record<string, unknown> = {
        type: practitionerType,
        status: practitionerStatus,

        consultationDurationMinutes:
          duration,
      };

      if (!editingPractitionerId) {
        requestBody.membershipId =
          membershipId;
      }

      /*
       * For updates, null explicitly clears an optional field.
       * For creation, empty fields are omitted.
       */
      addOptionalText(
        requestBody,
        'title',
        title,
        Boolean(
          editingPractitionerId,
        ),
      );

      addOptionalText(
        requestBody,
        'registrationNumber',
        normalizedRegistration,
        Boolean(
          editingPractitionerId,
        ),
      );

      addOptionalText(
        requestBody,
        'registrationAuthority',
        registrationAuthority,
        Boolean(
          editingPractitionerId,
        ),
      );

      addOptionalText(
        requestBody,
        'primarySpecialty',
        primarySpecialty,
        Boolean(
          editingPractitionerId,
        ),
      );

      setSubmitting(true);

      try {
        if (editingPractitionerId) {
          await apiJson<Practitioner>(
            `/organizations/${organizationId}/practitioners/${editingPractitionerId}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify(
                requestBody,
              ),
            },
          );

          setSuccessMessage(
            'Practitioner profile updated successfully.',
          );
        } else {
          await apiJson<Practitioner>(
            `/organizations/${organizationId}/practitioners`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify(
                requestBody,
              ),
            },
          );

          setSuccessMessage(
            'Practitioner profile created successfully.',
          );
        }

        resetForm();
        await loadDependencies();

        if (
          !editingPractitionerId &&
          page !== 1
        ) {
          setPage(1);
        } else {
          await loadPractitioners();
        }
      } catch (
        requestError: unknown
      ) {
        setFormError(
          getErrorMessage(
            requestError,
            editingPractitionerId
              ? 'Unable to update practitioner profile.'
              : 'Unable to create practitioner profile.',
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  const handleSearchSubmit =
    (
      event:
        FormEvent<HTMLFormElement>,
    ): void => {
      event.preventDefault();

      setPage(1);

      setSubmittedSearch(
        search.trim(),
      );
    };

  const clearFilters = (): void => {
    setSearch('');
    setSubmittedSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setFacilityFilter('');
    setPage(1);
  };

  if (!organizationId) {
    return (
      <section className="empty-state">
        <p className="eyebrow">
          Administration
        </p>

        <h1>Practitioners</h1>

        <p>
          Select an active organization
          before managing practitioner
          profiles.
        </p>
      </section>
    );
  }

  return (
    <section className="administration-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            Administration
          </p>

          <h1>Practitioners</h1>

          <p>
            Manage clinical practitioner
            profiles, professional
            registration and specialty
            information.
          </p>
        </div>
      </header>

      {pageError && (
        <div
          className="alert alert-error"
          role="alert"
        >
          {pageError}
        </div>
      )}

      {successMessage && (
        <div
          className="alert alert-success"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {(canCreatePractitioner ||
        editingPractitioner) && (
        <section className="data-card">
          <div className="data-card-header">
            <div>
              <h2>
                {editingPractitioner
                  ? 'Edit practitioner'
                  : 'Create practitioner'}
              </h2>

              <p>
                {editingPractitioner
                  ? 'Update the selected practitioner profile.'
                  : 'Create a clinical profile for an active staff member.'}
              </p>
            </div>
          </div>

          {formError && (
            <div
              className="alert alert-error"
              role="alert"
            >
              {formError}
            </div>
          )}

          <form
            className="admin-form"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <div className="form-grid">
              <label htmlFor="practitioner-membership">
                <span>
                  Staff member
                </span>

                <select
                  id="practitioner-membership"
                  value={membershipId}
                  disabled={
                    submitting ||
                    dependenciesLoading ||
                    Boolean(
                      editingPractitionerId,
                    )
                  }
                  required={
                    !editingPractitionerId
                  }
                  onChange={(event) => {
                    setMembershipId(
                      event.target.value,
                    );
                  }}
                >
                  <option value="">
                    {dependenciesLoading
                      ? 'Loading members…'
                      : availableMemberships.length ===
                          0
                        ? 'No eligible staff — create one in Staff first'
                        : 'Select member'}
                  </option>

                  {editingPractitioner && (
                    <option
                      value={
                        editingPractitioner.membershipId
                      }
                    >
                      {formatUserName(
                        editingPractitioner
                          .membership.user,
                      )}{' '}
                      —{' '}
                      {
                        editingPractitioner
                          .membership.user
                          .email
                      }
                    </option>
                  )}

                  {!editingPractitioner &&
                    availableMemberships.map(
                      (membership) => (
                        <option
                          key={
                            membership.id
                          }
                          value={
                            membership.id
                          }
                        >
                          {formatUserName(
                            membership.user,
                          )}{' '}
                          —{' '}
                          {
                            membership.user
                              .email
                          }
                        </option>
                      ),
                    )}
                </select>
              </label>

              <label htmlFor="practitioner-type">
                <span>
                  Practitioner type
                </span>

                <select
                  id="practitioner-type"
                  value={
                    practitionerType
                  }
                  disabled={submitting}
                  onChange={(event) => {
                    setPractitionerType(
                      event.target
                        .value as PractitionerType,
                    );
                  }}
                >
                  {PRACTITIONER_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label htmlFor="practitioner-status">
                <span>Status</span>

                <select
                  id="practitioner-status"
                  value={
                    practitionerStatus
                  }
                  disabled={submitting}
                  onChange={(event) => {
                    setPractitionerStatus(
                      event.target
                        .value as PractitionerStatus,
                    );
                  }}
                >
                  {PRACTITIONER_STATUSES.map(
                    (status) => (
                      <option
                        key={
                          status.value
                        }
                        value={
                          status.value
                        }
                      >
                        {
                          status.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label htmlFor="practitioner-title">
                <span>Title</span>

                <input
                  id="practitioner-title"
                  value={title}
                  maxLength={30}
                  placeholder="Dr."
                  disabled={submitting}
                  onChange={(event) => {
                    setTitle(
                      event.target.value,
                    );
                  }}
                />
              </label>

              <label htmlFor="registration-number">
                <span>
                  Registration number
                </span>

                <input
                  id="registration-number"
                  value={
                    registrationNumber
                  }
                  maxLength={100}
                  placeholder="SLMC-12345"
                  disabled={submitting}
                  onChange={(event) => {
                    setRegistrationNumber(
                      event.target.value.toUpperCase(),
                    );
                  }}
                />
              </label>

              <label htmlFor="registration-authority">
                <span>
                  Registration authority
                </span>

                <input
                  id="registration-authority"
                  value={
                    registrationAuthority
                  }
                  maxLength={150}
                  placeholder="Sri Lanka Medical Council"
                  disabled={submitting}
                  onChange={(event) => {
                    setRegistrationAuthority(
                      event.target.value,
                    );
                  }}
                />
              </label>

              <label htmlFor="primary-specialty">
                <span>
                  Primary specialty
                </span>

                <input
                  id="primary-specialty"
                  value={
                    primarySpecialty
                  }
                  maxLength={150}
                  placeholder="General Medicine"
                  disabled={submitting}
                  onChange={(event) => {
                    setPrimarySpecialty(
                      event.target.value,
                    );
                  }}
                />
              </label>

              <label htmlFor="consultation-duration">
                <span>
                  Consultation duration
                  in minutes
                </span>

                <input
                  id="consultation-duration"
                  type="number"
                  min={5}
                  max={480}
                  step={1}
                  value={
                    consultationDuration
                  }
                  disabled={submitting}
                  required
                  onChange={(event) => {
                    setConsultationDuration(
                      event.target.value,
                    );
                  }}
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Saving…'
                  : editingPractitioner
                    ? 'Save changes'
                    : 'Create practitioner'}
              </button>

              {editingPractitioner && (
                <button
                  type="button"
                  className="button-secondary"
                  disabled={submitting}
                  onClick={resetForm}
                >
                  Cancel editing
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {!canCreatePractitioner &&
        !editingPractitioner && (
          <div className="alert alert-info">
            You can view practitioners,
            but you do not have permission
            to create practitioner
            profiles.
          </div>
        )}

      <section className="data-card">
        <div className="data-card-header">
          <div>
            <h2>
              Registered practitioners
            </h2>

            <p>
              Search and filter clinical
              practitioners in the active
              organization.
            </p>
          </div>

          <span className="record-count">
            {meta.total}
          </span>
        </div>

        <form
          className="filter-bar practitioners-filter-bar"
          onSubmit={
            handleSearchSubmit
          }
        >
          <label htmlFor="practitioner-search">
            <span>Search</span>

            <input
              id="practitioner-search"
              type="search"
              value={search}
              placeholder="Name, email, registration or specialty"
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
              }}
            />
          </label>

          <label htmlFor="practitioner-type-filter">
            <span>Type</span>

            <select
              id="practitioner-type-filter"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(
                  event.target
                    .value as
                    | PractitionerType
                    | '',
                );

                setPage(1);
              }}
            >
              <option value="">
                All types
              </option>

              {PRACTITIONER_TYPES.map(
                (type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label htmlFor="practitioner-status-filter">
            <span>Status</span>

            <select
              id="practitioner-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target
                    .value as
                    | PractitionerStatus
                    | '',
                );

                setPage(1);
              }}
            >
              <option value="">
                All statuses
              </option>

              {PRACTITIONER_STATUSES.map(
                (status) => (
                  <option
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {status.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label htmlFor="practitioner-facility-filter">
            <span>Facility</span>

            <select
              id="practitioner-facility-filter"
              value={facilityFilter}
              disabled={
                dependenciesLoading
              }
              onChange={(event) => {
                setFacilityFilter(
                  event.target.value,
                );

                setPage(1);
              }}
            >
              <option value="">
                All facilities
              </option>

              {facilities.map(
                (facility) => (
                  <option
                    key={facility.id}
                    value={facility.id}
                  >
                    {facility.code} —{' '}
                    {facility.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="filter-actions">
            <button type="submit">
              Search
            </button>

            <button
              type="button"
              className="button-secondary"
              onClick={clearFilters}
            >
              Clear
            </button>
          </div>
        </form>

        {practitionersLoading ? (
          <div className="loading-state">
            Loading practitioners…
          </div>
        ) : practitioners.length ===
          0 ? (
          <div className="empty-state compact">
            <h3>
              No practitioners found
            </h3>

            <p>
              Create the first practitioner
              or adjust the current
              filters.
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Registration</th>
                    <th>Specialty</th>
                    <th>Facilities</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {practitioners.map(
                    (practitioner) => (
                      <tr
                        key={
                          practitioner.id
                        }
                      >
                        <td>
                          <strong>
                            {practitioner.title
                              ? `${practitioner.title} `
                              : ''}

                            {formatUserName(
                              practitioner
                                .membership
                                .user,
                            )}
                          </strong>

                          <div className="secondary-text">
                            {
                              practitioner
                                .membership
                                .user.email
                            }
                          </div>
                        </td>

                        <td>
                          {formatEnumLabel(
                            practitioner.type,
                          )}
                        </td>

                        <td>
                          {practitioner.registrationNumber ??
                            '—'}

                          {practitioner.registrationAuthority && (
                            <div className="secondary-text">
                              {
                                practitioner.registrationAuthority
                              }
                            </div>
                          )}
                        </td>

                        <td>
                          {practitioner.primarySpecialty ??
                            '—'}
                        </td>

                        <td>
                          {formatFacilities(
                            practitioner
                              .membership
                              .facilityAssignments,
                          )}
                        </td>

                        <td>
                          {
                            practitioner.consultationDurationMinutes
                          }{' '}
                          minutes
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${practitioner.status.toLowerCase()}`}
                          >
                            {formatEnumLabel(
                              practitioner.status,
                            )}
                          </span>
                        </td>

                        <td>
                          {canUpdatePractitioner ? (
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => {
                                startEditing(
                                  practitioner,
                                );
                              }}
                            >
                              Edit
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar">
              <span>
                Page {meta.page} of{' '}
                {Math.max(
                  meta.totalPages,
                  1,
                )}
              </span>

              <div className="pagination-actions">
                <button
                  type="button"
                  className="button-secondary"
                  disabled={
                    practitionersLoading ||
                    page <= 1
                  }
                  onClick={() => {
                    setPage(
                      (currentPage) =>
                        Math.max(
                          currentPage -
                            1,
                          1,
                        ),
                    );
                  }}
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="button-secondary"
                  disabled={
                    practitionersLoading ||
                    meta.totalPages ===
                      0 ||
                    page >=
                      meta.totalPages
                  }
                  onClick={() => {
                    setPage(
                      (currentPage) =>
                        currentPage +
                        1,
                    );
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function extractItems<T>(
  response: CollectionResponse<T>,
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(response.data)
    ? response.data
    : [];
}

function addOptionalText(
  target: Record<string, unknown>,
  field: string,
  value: string,
  includeNull: boolean,
): void {
  const normalized = value.trim();

  if (normalized) {
    target[field] = normalized;
    return;
  }

  if (includeNull) {
    target[field] = null;
  }
}

function formatUserName(
  user: UserSummary,
): string {
  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user.email;
}

function formatFacilities(
  assignments: FacilityAssignment[],
): string {
  if (
    !Array.isArray(assignments) ||
    assignments.length === 0
  ) {
    return '—';
  }

  return assignments
    .map((assignment) =>
      assignment.isPrimary
        ? `${assignment.facility.name} (Primary)`
        : assignment.facility.name,
    )
    .join(', ');
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function formatEnumLabel(
  value: string,
): string {
  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}