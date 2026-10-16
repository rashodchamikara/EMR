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

import { allPages } from './workforce-api';
import { apiJson } from '../api/api-client';
import { useAuth } from '../auth/useAuth';

type StaffAssignmentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED';

type PrimaryFilter =
  | ''
  | 'PRIMARY'
  | 'SECONDARY';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Facility {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: string;
  status: string;
  city: string | null;
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

interface OrganizationMembership {
  id: string;
  organizationId: string;
  status: string;
  isPrimary: boolean;
  user: UserSummary;
  roles: MembershipRole[];
}

interface StaffAssignment {
  id: string;
  organizationId: string;
  facilityId: string;
  membershipId: string;
  status: StaffAssignmentStatus;
  isPrimary: boolean;
  assignedAt: string;
  endedAt: string | null;

  membership: {
    id: string;
    user: UserSummary;
    roles: MembershipRole[];
  };

  facility?: {
    id: string;
    code: string;
    name: string;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

type CollectionResponse<T> =
  | T[]
  | PaginatedResponse<T>;

interface AssignStaffRequest {
  membershipId: string;
  isPrimary: boolean;
}

interface UpdateStaffAssignmentRequest {
  status?: StaffAssignmentStatus;
  isPrimary?: boolean;
}

export function StaffAssignments({ onChanged }: { onChanged?: () => void }) {
  const auth = useAuth();
  const assignmentRequest = useRef(0);

  const organizationId =
    auth.user?.organizationId ?? null;

  const permissions =
    auth.user?.permissions ?? [];

  const canAssignStaff =
    permissions.includes(
      'staff.assign',
    );

  const canUpdateStaff =
    permissions.includes(
      'staff.update',
    );

  const [
    facilities,
    setFacilities,
  ] = useState<Facility[]>([]);

  const [
    memberships,
    setMemberships,
  ] = useState<
    OrganizationMembership[]
  >([]);

  const [
    assignments,
    setAssignments,
  ] = useState<StaffAssignment[]>(
    [],
  );

  const [
    selectedFacilityId,
    setSelectedFacilityId,
  ] = useState('');

  const [
    selectedMembershipId,
    setSelectedMembershipId,
  ] = useState('');

  const [
    isPrimary,
    setIsPrimary,
  ] = useState(false);

  const [
    showAssignForm,
    setShowAssignForm,
  ] = useState(false);

  const [
    facilitiesLoading,
    setFacilitiesLoading,
  ] = useState(false);

  const [
    membershipsLoading,
    setMembershipsLoading,
  ] = useState(false);

  const [
    assignmentsLoading,
    setAssignmentsLoading,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    updatingAssignmentId,
    setUpdatingAssignmentId,
  ] = useState<string | null>(
    null,
  );

  const [
    pageError,
    setPageError,
  ] = useState<string | null>(
    null,
  );

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    StaffAssignmentStatus | ''
  >('');

  const [
    primaryFilter,
    setPrimaryFilter,
  ] = useState<PrimaryFilter>(
    '',
  );

  const selectedFacility =
    useMemo(
      () =>
        facilities.find(
          (facility) =>
            facility.id ===
            selectedFacilityId,
        ) ?? null,
      [
        facilities,
        selectedFacilityId,
      ],
    );

  const selectedMembership =
    useMemo(
      () =>
        memberships.find(
          (membership) =>
            membership.id ===
            selectedMembershipId,
        ) ?? null,
      [
        memberships,
        selectedMembershipId,
      ],
    );

  /**
   * Memberships already assigned to this
   * facility should not appear in the
   * assignment dropdown.
   */
  const assignableMemberships =
    useMemo(() => {
      const assignedMembershipIds =
        new Set(
          assignments.map(
            (assignment) =>
              assignment.membershipId,
          ),
        );

      return memberships.filter(
        (membership) =>
          !assignedMembershipIds.has(
            membership.id,
          ),
      );
    }, [
      assignments,
      memberships,
    ]);

  /**
   * Staff filtering is client-side because
   * the existing staff endpoint currently
   * returns the facility assignment
   * collection without filter parameters.
   */
  const filteredAssignments =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return assignments.filter(
        (assignment) => {
          const user =
            assignment.membership.user;

          const roles =
            getRoleNames(
              assignment.membership
                .roles,
            );

          const searchableText = [
            user.firstName,
            user.lastName,
            user.email,
            user.phone ?? '',
            ...roles,
          ]
            .join(' ')
            .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            searchableText.includes(
              normalizedSearch,
            );

          const matchesStatus =
            !statusFilter ||
            assignment.status ===
              statusFilter;

          const matchesPrimary =
            !primaryFilter ||
            (primaryFilter ===
              'PRIMARY' &&
              assignment.isPrimary) ||
            (primaryFilter ===
              'SECONDARY' &&
              !assignment.isPrimary);

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPrimary
          );
        },
      );
    }, [
      assignments,
      search,
      statusFilter,
      primaryFilter,
    ]);

  const activeStaffCount =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            assignment.status ===
            'ACTIVE',
        ).length,
      [assignments],
    );

  const suspendedStaffCount =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            assignment.status ===
            'SUSPENDED',
        ).length,
      [assignments],
    );

  const primaryStaffCount =
    useMemo(
      () =>
        assignments.filter(
          (assignment) =>
            assignment.isPrimary,
        ).length,
      [assignments],
    );

  const hasActiveFilters =
    Boolean(
      search ||
        statusFilter ||
        primaryFilter,
    );

  const loadFacilities =
    useCallback(
      async (): Promise<void> => {
        if (!organizationId) {
          setFacilities([]);
          setSelectedFacilityId('');
          return;
        }

        setFacilitiesLoading(true);

        try {
          const response =
            await apiJson<
              CollectionResponse<Facility>
            >(
              `/organizations/${organizationId}/memberships/facilities`,
            );

          const activeFacilities =
            extractItems(
              response,
            ).filter(
              (facility) =>
                facility.status ===
                'ACTIVE',
            );

          setFacilities(
            activeFacilities,
          );

          setSelectedFacilityId(
            (
              currentFacilityId,
            ) => {
              const stillExists =
                activeFacilities.some(
                  (facility) =>
                    facility.id ===
                    currentFacilityId,
                );

              if (stillExists) {
                return currentFacilityId;
              }

              return (
                activeFacilities[0]
                  ?.id ?? ''
              );
            },
          );
        } catch (
          requestError: unknown
        ) {
          setFacilities([]);
          setSelectedFacilityId('');

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load facilities.',
            ),
          );
        } finally {
          setFacilitiesLoading(false);
        }
      },
      [organizationId],
    );

  const loadMemberships =
    useCallback(
      async (): Promise<void> => {
        if (!organizationId) {
          setMemberships([]);
          return;
        }

        setMembershipsLoading(true);

        try {
          const response =
            await allPages<OrganizationMembership>(`/organizations/${organizationId}/memberships?status=ACTIVE`);

          const activeMemberships =
            extractItems(
              response,
            ).filter(
              (membership) =>
                membership.status ===
                  'ACTIVE' &&
                membership.user.status ===
                  'ACTIVE',
            );

          setMemberships(
            activeMemberships,
          );
        } catch (
          requestError: unknown
        ) {
          setMemberships([]);

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load staff members.',
            ),
          );
        } finally {
          setMembershipsLoading(false);
        }
      },
      [organizationId],
    );

  const loadAssignments =
    useCallback(
      async (): Promise<void> => {
        const requestId = ++assignmentRequest.current;
        if (
          !organizationId ||
          !selectedFacilityId
        ) {
          setAssignments([]);
          return;
        }

        setAssignmentsLoading(true);
        setPageError(null);

        try {
          const response =
            await apiJson<
              CollectionResponse<StaffAssignment>
            >(
              `/organizations/${organizationId}/facilities/${selectedFacilityId}/staff`,
            );

          if (requestId !== assignmentRequest.current) return;
          setAssignments(
            extractItems(response),
          );
        } catch (
          requestError: unknown
        ) {
          if (requestId !== assignmentRequest.current) return;
          setAssignments([]);

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load staff assignments.',
            ),
          );
        } finally {
          if (requestId === assignmentRequest.current) setAssignmentsLoading(false);
        }
      },
      [
        organizationId,
        selectedFacilityId,
      ],
    );

  /**
   * Organization switching must clear
   * data belonging to the previous
   * organization.
   */
  useEffect(() => {
    setFacilities([]);
    setMemberships([]);
    setAssignments([]);

    setSelectedFacilityId('');
    setSelectedMembershipId('');
    setIsPrimary(false);
    setShowAssignForm(false);

    setSearch('');
    setStatusFilter('');
    setPrimaryFilter('');

    setPageError(null);
    setFormError(null);
    setSuccessMessage(null);

    void Promise.all([
      loadFacilities(),
      loadMemberships(),
    ]);
  }, [
    organizationId,
    loadFacilities,
    loadMemberships,
  ]);

  useEffect(() => {
    setAssignments([]);
    setSelectedMembershipId('');
    setIsPrimary(false);
    setShowAssignForm(false);

    setSearch('');
    setStatusFilter('');
    setPrimaryFilter('');

    setFormError(null);
    setSuccessMessage(null);

    void loadAssignments();
  }, [
    selectedFacilityId,
    loadAssignments,
  ]);

  const resetAssignmentForm =
    (): void => {
      setSelectedMembershipId('');
      setIsPrimary(false);
      setFormError(null);
    };

  const handleAssignStaff =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      event.preventDefault();

      setFormError(null);
      setSuccessMessage(null);

      if (!organizationId) {
        setFormError(
          'Select an active organization before assigning staff.',
        );

        return;
      }

      if (!selectedFacilityId) {
        setFormError(
          'Select a facility before assigning staff.',
        );

        return;
      }

      if (!selectedMembershipId) {
        setFormError(
          'Select an organization member.',
        );

        return;
      }

      const requestBody:
        AssignStaffRequest = {
        membershipId:
          selectedMembershipId,
        isPrimary,
      };

      setSubmitting(true);

      try {
        await apiJson<StaffAssignment>(
          `/organizations/${organizationId}/facilities/${selectedFacilityId}/staff`,
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

        resetAssignmentForm();

        setSuccessMessage(
          'Staff member assigned successfully.',
        );

        await loadAssignments();
        onChanged?.();
      } catch (
        requestError: unknown
      ) {
        setFormError(
          getErrorMessage(
            requestError,
            'Unable to assign staff member.',
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  const updateAssignment =
    async (
      assignmentId: string,
      requestBody:
        UpdateStaffAssignmentRequest,
      successText: string,
    ): Promise<void> => {
      if (
        !organizationId ||
        !selectedFacilityId
      ) {
        return;
      }

      setPageError(null);
      setSuccessMessage(null);

      setUpdatingAssignmentId(
        assignmentId,
      );

      try {
        await apiJson<StaffAssignment>(
          `/organizations/${organizationId}/facilities/${selectedFacilityId}/staff/${assignmentId}`,
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
          successText,
        );

        await loadAssignments();
        onChanged?.();
      } catch (
        requestError: unknown
      ) {
        setPageError(
          getErrorMessage(
            requestError,
            'Unable to update the staff assignment.',
          ),
        );
      } finally {
        setUpdatingAssignmentId(
          null,
        );
      }
    };

  const handleSuspend =
    (
      assignment:
        StaffAssignment,
    ): void => {
      const staffName =
        formatUserName(
          assignment.membership.user,
        );

      const confirmed =
        window.confirm(
          `Suspend ${staffName} from ${selectedFacility?.name ?? 'this facility'}?`,
        );

      if (!confirmed) {
        return;
      }

      void updateAssignment(
        assignment.id,
        {
          status: 'SUSPENDED',
        },
        'Staff assignment suspended.',
      );
    };

  const clearFilters =
    (): void => {
      setSearch('');
      setStatusFilter('');
      setPrimaryFilter('');
    };

  if (!organizationId) {
    return (
      <section className="staff-page">
        <div className="staff-empty-page">
          <div className="staff-empty-icon">
            S
          </div>

          <p className="staff-eyebrow">
            Administration
          </p>

          <h1>
            Select an organization
          </h1>

          <p>
            Choose an active organization
            before managing staff and
            facility assignments.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="staff-page">
      {/* PAGE HEADER */}

      <header className="staff-page-header">
        <div className="staff-page-heading">
          <p className="staff-eyebrow">
            Administration
          </p>

          <h1>
            Staff assignments
          </h1>

          <p className="staff-page-description">
            Manage facility access,
            working locations and primary
            assignments for organization
            staff.
          </p>
        </div>

        {canAssignStaff && (
          <button
            type="button"
            className="staff-primary-button"
            disabled={
              !selectedFacilityId
            }
            onClick={() => {
              setFormError(null);
              setSuccessMessage(null);

              setShowAssignForm(
                (current) =>
                  !current,
              );
            }}
          >
            <span
              className="staff-button-icon"
              aria-hidden="true"
            >
              +
            </span>

            {showAssignForm
              ? 'Close form'
              : 'Assign staff'}
          </button>
        )}
      </header>

      {/* GLOBAL ERROR */}

      {pageError && (
        <div
          className="staff-alert staff-alert-error"
          role="alert"
        >
          <div className="staff-alert-symbol">
            !
          </div>

          <div>
            <strong>
              Something went wrong
            </strong>

            <span>{pageError}</span>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {successMessage &&
        !showAssignForm && (
          <div
            className="staff-alert staff-alert-success"
            role="status"
          >
            <div className="staff-alert-symbol">
              ✓
            </div>

            <div>
              <strong>
                Update completed
              </strong>

              <span>
                {successMessage}
              </span>
            </div>
          </div>
        )}

      {/* FACILITY CONTEXT */}

      <section className="staff-context-card">
        <div className="staff-context-main">
          <div className="staff-context-copy">
            <span className="staff-field-label">
              Facility
            </span>

            <p>
              Select the healthcare
              facility whose staff
              assignments you want to
              manage.
            </p>
          </div>

          <div className="staff-facility-control">
            <select
              id="staff-facility"
              aria-label="Select facility"
              value={
                selectedFacilityId
              }
              disabled={
                facilitiesLoading ||
                facilities.length === 0
              }
              onChange={(event) => {
                setSelectedFacilityId(
                  event.target.value,
                );
              }}
            >
              <option value="">
                {facilitiesLoading
                  ? 'Loading facilities…'
                  : facilities.length ===
                      0
                    ? 'No active facilities'
                    : 'Select facility'}
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
          </div>
        </div>

        {selectedFacility && (
          <div className="staff-facility-summary">
            <div className="staff-facility-avatar">
              {getInitials(
                selectedFacility.name,
              )}
            </div>

            <div className="staff-facility-details">
              <strong>
                {
                  selectedFacility.name
                }
              </strong>

              <span>
                {
                  selectedFacility.code
                }

                {selectedFacility.city
                  ? ` • ${selectedFacility.city}`
                  : ''}

                {selectedFacility.type
                  ? ` • ${formatEnumLabel(
                      selectedFacility.type,
                    )}`
                  : ''}
              </span>
            </div>

            <span className="staff-context-status">
              <span
                className="staff-context-status-dot"
                aria-hidden="true"
              />

              Active facility
            </span>
          </div>
        )}
      </section>

      {/* ASSIGN STAFF */}

      {canAssignStaff &&
        showAssignForm && (
          <section className="staff-assign-card">
            <div className="staff-card-heading">
              <div>
                <p className="staff-card-kicker">
                  Facility assignment
                </p>

                <h2>
                  Assign staff member
                </h2>

                <p>
                  Assign an active
                  organization member to{' '}
                  <strong>
                    {selectedFacility?.name ??
                      'the selected facility'}
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                className="staff-icon-button"
                aria-label="Close staff assignment form"
                onClick={() => {
                  resetAssignmentForm();

                  setSuccessMessage(
                    null,
                  );

                  setShowAssignForm(
                    false,
                  );
                }}
              >
                ×
              </button>
            </div>

            {formError && (
              <div
                className="staff-alert staff-alert-error"
                role="alert"
              >
                <div className="staff-alert-symbol">
                  !
                </div>

                <div>
                  <strong>
                    Staff could not be
                    assigned
                  </strong>

                  <span>
                    {formError}
                  </span>
                </div>
              </div>
            )}

            {successMessage && (
              <div
                className="staff-alert staff-alert-success"
                role="status"
              >
                <div className="staff-alert-symbol">
                  ✓
                </div>

                <div>
                  <strong>
                    Assignment created
                  </strong>

                  <span>
                    {successMessage}
                  </span>
                </div>
              </div>
            )}

            <form
              onSubmit={(event) => {
                void handleAssignStaff(
                  event,
                );
              }}
            >
              <div className="staff-assignment-grid">
                <label
                  className="staff-form-field"
                  htmlFor="staff-membership"
                >
                  <span>
                    Staff member
                    <em>*</em>
                  </span>

                  <select
                    id="staff-membership"
                    value={
                      selectedMembershipId
                    }
                    disabled={
                      submitting ||
                      membershipsLoading ||
                      !selectedFacilityId
                    }
                    required
                    onChange={(event) => {
                      setSelectedMembershipId(
                        event.target.value,
                      );
                    }}
                  >
                    <option value="">
                      {membershipsLoading
                        ? 'Loading members…'
                        : assignableMemberships.length ===
                            0
                          ? 'No unassigned members'
                          : 'Select staff member'}
                    </option>

                    {assignableMemberships.map(
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

                  <small>
                    Only active
                    staff members
                    not already assigned
                    to this facility are
                    shown.
                  </small>
                </label>

                <div className="staff-primary-option">
                  <label className="staff-primary-checkbox">
                    <input
                      type="checkbox"
                      checked={isPrimary}
                      disabled={
                        submitting ||
                        !selectedFacilityId
                      }
                      onChange={(
                        event,
                      ) => {
                        setIsPrimary(
                          event.target
                            .checked,
                        );
                      }}
                    />

                    <span className="staff-checkbox-control" />

                    <span className="staff-checkbox-copy">
                      <strong>
                        Primary facility
                      </strong>

                      <small>
                        Make this the
                        staff member&apos;s
                        main working
                        facility.
                      </small>
                    </span>
                  </label>
                </div>
              </div>

              {selectedMembership && (
                <div className="staff-member-preview">
                  <div className="staff-member-avatar staff-member-avatar-large">
                    {getUserInitials(
                      selectedMembership.user,
                    )}
                  </div>

                  <div className="staff-member-preview-main">
                    <strong>
                      {formatUserName(
                        selectedMembership.user,
                      )}
                    </strong>

                    <span>
                      {
                        selectedMembership
                          .user.email
                      }
                    </span>

                    {selectedMembership
                      .user.phone && (
                      <span>
                        {
                          selectedMembership
                            .user.phone
                        }
                      </span>
                    )}
                  </div>

                  <div className="staff-preview-roles">
                    <span>
                      Organization roles
                    </span>

                    <RoleChips
                      roles={
                        selectedMembership.roles
                      }
                    />
                  </div>
                </div>
              )}

              {assignableMemberships.length ===
                0 &&
                !membershipsLoading && (
                  <div className="staff-form-note">
                    All eligible
                    staff members
                    are already assigned
                    to this facility.
                  </div>
                )}

              <div className="staff-form-footer">
                <button
                  type="button"
                  className="staff-secondary-button"
                  disabled={submitting}
                  onClick={() => {
                    resetAssignmentForm();

                    setSuccessMessage(
                      null,
                    );

                    setShowAssignForm(
                      false,
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="staff-primary-button"
                  disabled={
                    submitting ||
                    !selectedFacilityId ||
                    !selectedMembershipId
                  }
                >
                  {submitting
                    ? 'Assigning staff…'
                    : 'Assign staff'}
                </button>
              </div>
            </form>
          </section>
        )}

      {!canAssignStaff && (
        <div
          className="staff-alert staff-alert-info"
          role="status"
        >
          <div className="staff-alert-symbol">
            i
          </div>

          <div>
            <strong>
              View-only access
            </strong>

            <span>
              You can view facility staff
              assignments, but you do not
              have permission to create
              them.
            </span>
          </div>
        </div>
      )}

      {/* STAFF DIRECTORY */}

      <section className="staff-list-card">
        <div className="staff-list-header">
          <div>
            <h2>
              Assigned staff
            </h2>

            <p>
              {selectedFacility
                ? `Staff members assigned to ${selectedFacility.name}.`
                : 'Select a facility to view its staff.'}
            </p>
          </div>

          <div className="staff-header-count">
            <strong>
              {assignments.length}
            </strong>

            <span>
              {assignments.length === 1
                ? 'staff member'
                : 'staff members'}
            </span>
          </div>
        </div>

        {/* SUMMARY */}

        {selectedFacilityId &&
          assignments.length > 0 && (
            <div className="staff-summary-grid">
              <div className="staff-summary-item">
                <div className="staff-summary-icon staff-summary-icon-active">
                  A
                </div>

                <div>
                  <span>
                    Active
                  </span>

                  <strong>
                    {
                      activeStaffCount
                    }
                  </strong>
                </div>
              </div>

              <div className="staff-summary-item">
                <div className="staff-summary-icon staff-summary-icon-primary">
                  P
                </div>

                <div>
                  <span>
                    Primary location
                  </span>

                  <strong>
                    {
                      primaryStaffCount
                    }
                  </strong>
                </div>
              </div>

              <div className="staff-summary-item">
                <div className="staff-summary-icon staff-summary-icon-suspended">
                  S
                </div>

                <div>
                  <span>
                    Suspended
                  </span>

                  <strong>
                    {
                      suspendedStaffCount
                    }
                  </strong>
                </div>
              </div>
            </div>
          )}

        {/* FILTER TOOLBAR */}

        {assignments.length > 0 && (
          <div className="staff-filter-toolbar">
            <div className="staff-search-control">
              <span
                className="staff-search-symbol"
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                type="search"
                value={search}
                aria-label="Search assigned staff"
                placeholder="Search name, email, phone or role..."
                onChange={(event) => {
                  setSearch(
                    event.target.value,
                  );
                }}
              />
            </div>

            <select
              className="staff-filter-select"
              value={statusFilter}
              aria-label="Filter staff by status"
              onChange={(event) => {
                setStatusFilter(
                  event.target
                    .value as
                    | StaffAssignmentStatus
                    | '',
                );
              }}
            >
              <option value="">
                All statuses
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>

              <option value="SUSPENDED">
                Suspended
              </option>
            </select>

            <select
              className="staff-filter-select"
              value={primaryFilter}
              aria-label="Filter staff by primary facility"
              onChange={(event) => {
                setPrimaryFilter(
                  event.target
                    .value as PrimaryFilter,
                );
              }}
            >
              <option value="">
                All assignments
              </option>

              <option value="PRIMARY">
                Primary facility
              </option>

              <option value="SECONDARY">
                Secondary facility
              </option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="staff-clear-button"
                onClick={
                  clearFilters
                }
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* CONTENT STATES */}

        {!selectedFacilityId ? (
          <div className="staff-empty-state">
            <div className="staff-empty-state-icon">
              F
            </div>

            <h3>
              Select a facility
            </h3>

            <p>
              Choose a facility above to
              view and manage its staff
              assignments.
            </p>
          </div>
        ) : assignmentsLoading ? (
          <div
            className="staff-loading-state"
            aria-live="polite"
          >
            <span className="staff-spinner" />

            <div>
              <strong>
                Loading staff
              </strong>

              <p>
                Retrieving facility staff
                assignments…
              </p>
            </div>
          </div>
        ) : assignments.length ===
          0 ? (
          <div className="staff-empty-state">
            <div className="staff-empty-state-icon">
              S
            </div>

            <h3>
              No staff assigned
            </h3>

            <p>
              This facility does not have
              any staff assignments yet.
            </p>

            {canAssignStaff && (
              <button
                type="button"
                className="staff-primary-button"
                onClick={() => {
                  setShowAssignForm(
                    true,
                  );
                }}
              >
                + Assign first staff
                member
              </button>
            )}
          </div>
        ) : filteredAssignments.length ===
          0 ? (
          <div className="staff-empty-state">
            <div className="staff-empty-state-icon">
              ?
            </div>

            <h3>
              No matching staff
            </h3>

            <p>
              No staff assignments match
              the current search or
              filters.
            </p>

            <button
              type="button"
              className="staff-secondary-button"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>
                      Staff member
                    </th>

                    <th>
                      Contact
                    </th>

                    <th>
                      Roles
                    </th>

                    <th>
                      Facility type
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Assigned
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAssignments.map(
                    (assignment) => {
                      const user =
                        assignment
                          .membership
                          .user;

                      const isUpdating =
                        updatingAssignmentId ===
                        assignment.id;

                      return (
                        <tr
                          key={
                            assignment.id
                          }
                        >
                          <td>
                            <div className="staff-identity">
                              <div className="staff-member-avatar">
                                {getUserInitials(
                                  user,
                                )}
                              </div>

                              <div className="staff-identity-copy">
                                <strong>
                                  {formatUserName(
                                    user,
                                  )}
                                </strong>

                                <span>
                                  Staff
                                  assignment
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="staff-contact-cell">
                              <strong>
                                {
                                  user.email
                                }
                              </strong>

                              <span>
                                {user.phone ??
                                  'No phone number'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <RoleChips
                              roles={
                                assignment
                                  .membership
                                  .roles
                              }
                            />
                          </td>

                          <td>
                            {assignment.isPrimary ? (
                              <span className="staff-primary-badge">
                                <span
                                  className="staff-primary-dot"
                                  aria-hidden="true"
                                />

                                Primary
                              </span>
                            ) : (
                              <span className="staff-secondary-badge">
                                Secondary
                              </span>
                            )}
                          </td>

                          <td>
                            <StaffStatusBadge
                              status={
                                assignment.status
                              }
                            />
                          </td>

                          <td>
                            <span className="staff-date-cell">
                              {formatDateTime(
                                assignment.assignedAt,
                              )}
                            </span>
                          </td>

                          <td>
                            {canUpdateStaff ? (
                              <div className="staff-row-actions">
                                {!assignment.isPrimary &&
                                  assignment.status ===
                                    'ACTIVE' && (
                                    <button
                                      type="button"
                                      className="staff-action-button"
                                      disabled={
                                        isUpdating
                                      }
                                      onClick={() => {
                                        void updateAssignment(
                                          assignment.id,
                                          {
                                            isPrimary:
                                              true,
                                          },
                                          'Primary facility updated successfully.',
                                        );
                                      }}
                                    >
                                      Set primary
                                    </button>
                                  )}

                                {assignment.status ===
                                'ACTIVE' ? (
                                  <button
                                    type="button"
                                    className="staff-action-button staff-action-warning"
                                    disabled={
                                      isUpdating
                                    }
                                    onClick={() => {
                                      handleSuspend(
                                        assignment,
                                      );
                                    }}
                                  >
                                    {isUpdating
                                      ? 'Updating…'
                                      : 'Suspend'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="staff-action-button staff-action-positive"
                                    disabled={
                                      isUpdating
                                    }
                                    onClick={() => {
                                      void updateAssignment(
                                        assignment.id,
                                        {
                                          status:
                                            'ACTIVE',
                                        },
                                        'Staff assignment activated.',
                                      );
                                    }}
                                  >
                                    {isUpdating
                                      ? 'Updating…'
                                      : 'Activate'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="staff-muted">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <footer className="staff-table-footer">
              <p>
                Showing{' '}
                <strong>
                  {
                    filteredAssignments.length
                  }
                </strong>{' '}
                of{' '}
                <strong>
                  {
                    assignments.length
                  }
                </strong>{' '}
                staff assignments
              </p>
            </footer>
          </>
        )}
      </section>
    </section>
  );
}

function StaffStatusBadge({
  status,
}: {
  status: StaffAssignmentStatus;
}) {
  return (
    <span
      className={`staff-status staff-status-${status.toLowerCase()}`}
    >
      <span
        className="staff-status-dot"
        aria-hidden="true"
      />

      {formatEnumLabel(status)}
    </span>
  );
}

function RoleChips({
  roles,
}: {
  roles: MembershipRole[];
}) {
  const roleNames =
    getRoleNames(roles);

  if (roleNames.length === 0) {
    return (
      <span className="staff-muted">
        No roles
      </span>
    );
  }

  return (
    <div className="staff-role-list">
      {roleNames
        .slice(0, 2)
        .map((roleName) => (
          <span
            key={roleName}
            className="staff-role-chip"
          >
            {roleName}
          </span>
        ))}

      {roleNames.length > 2 && (
        <span
          className="staff-role-more"
          title={roleNames
            .slice(2)
            .join(', ')}
        >
          +{roleNames.length - 2}
        </span>
      )}
    </div>
  );
}

function extractItems<T>(
  response:
    CollectionResponse<T>,
): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  return Array.isArray(
    response.data,
  )
    ? response.data
    : [];
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

function getUserInitials(
  user: UserSummary,
): string {
  const firstInitial =
    user.firstName
      ?.trim()
      .charAt(0) ?? '';

  const lastInitial =
    user.lastName
      ?.trim()
      .charAt(0) ?? '';

  const initials =
    `${firstInitial}${lastInitial}`.toUpperCase();

  if (initials) {
    return initials;
  }

  return user.email
    .slice(0, 2)
    .toUpperCase();
}

function getInitials(
  value: string,
): string {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'F';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[1][0]
  ).toUpperCase();
}

function getRoleNames(
  roles: MembershipRole[],
): string[] {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map(
      (item) =>
        item.role?.name,
    )
    .filter(
      (
        roleName,
      ): roleName is string =>
        Boolean(roleName),
    );
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return error instanceof Error
    ? error.message
    : fallbackMessage;
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-LK',
    {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function formatEnumLabel(
  value: string,
): string {
  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}