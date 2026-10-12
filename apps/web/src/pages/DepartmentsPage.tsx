import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  FormEvent,
} from 'react';

import { apiJson } from '../api/api-client';
import { useAuth } from '../auth/useAuth';

type DepartmentStatus =
  | 'ACTIVE'
  | 'INACTIVE';

interface Facility {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: string;
  status: string;
  city: string | null;
}

interface Department {
  id: string;
  organizationId: string;
  facilityId: string;
  code: string;
  name: string;
  description: string | null;
  status: DepartmentStatus;
  createdAt: string;
  updatedAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FacilityListResponse {
  data: Facility[];
  meta: PaginationMeta;
}

interface DepartmentListResponse {
  data: Department[];
  meta: PaginationMeta;
}

interface CreateDepartmentRequest {
  code: string;
  name: string;
  description?: string;
  status: DepartmentStatus;
}

const PAGE_SIZE = 20;

export function DepartmentsPage() {
  const auth = useAuth();

  const organizationId =
    auth.user?.organizationId ?? null;

  const permissions =
    auth.user?.permissions ?? [];

  const canCreateDepartment =
    permissions.includes(
      'departments.create',
    );

  const [
    facilities,
    setFacilities,
  ] = useState<Facility[]>([]);

  const [
    selectedFacilityId,
    setSelectedFacilityId,
  ] = useState('');

  const [
    departments,
    setDepartments,
  ] = useState<Department[]>([]);

  const [
    facilitiesLoading,
    setFacilitiesLoading,
  ] = useState(false);

  const [
    departmentsLoading,
    setDepartmentsLoading,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

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
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [search, setSearch] =
    useState('');

  const [
    submittedSearch,
    setSubmittedSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    DepartmentStatus | ''
  >('');

  const [page, setPage] =
    useState(1);

  const [meta, setMeta] =
    useState<PaginationMeta>({
      page: 1,
      limit: PAGE_SIZE,
      total: 0,
      totalPages: 0,
    });

  const [code, setCode] =
    useState('');

  const [name, setName] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    departmentStatus,
    setDepartmentStatus,
  ] = useState<DepartmentStatus>(
    'ACTIVE',
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

  const hasActiveFilters =
    Boolean(
      submittedSearch ||
        statusFilter,
    );

  const firstRecord =
    meta.total === 0
      ? 0
      : (meta.page - 1) *
          meta.limit +
        1;

  const lastRecord =
    Math.min(
      meta.page * meta.limit,
      meta.total,
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
        setPageError(null);

        try {
          const response =
            await apiJson<
              FacilityListResponse
            >(
              `/organizations/${organizationId}/facilities?page=1&limit=100`,
            );

          const activeFacilities =
            Array.isArray(
              response.data,
            )
              ? response.data.filter(
                  (facility) =>
                    facility.status ===
                    'ACTIVE',
                )
              : [];

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

  const loadDepartments =
    useCallback(
      async (): Promise<void> => {
        if (
          !organizationId ||
          !selectedFacilityId
        ) {
          setDepartments([]);

          setMeta({
            page: 1,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          });

          return;
        }

        setDepartmentsLoading(true);
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

          if (statusFilter) {
            query.set(
              'status',
              statusFilter,
            );
          }

          const response =
            await apiJson<
              DepartmentListResponse
            >(
              `/organizations/${organizationId}/facilities/${selectedFacilityId}/departments?${query.toString()}`,
            );

          setDepartments(
            Array.isArray(
              response.data,
            )
              ? response.data
              : [],
          );

          setMeta(response.meta);
        } catch (
          requestError: unknown
        ) {
          setDepartments([]);

          setMeta({
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          });

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load departments.',
            ),
          );
        } finally {
          setDepartmentsLoading(false);
        }
      },
      [
        organizationId,
        selectedFacilityId,
        page,
        submittedSearch,
        statusFilter,
      ],
    );

  useEffect(() => {
    setPage(1);
    setSubmittedSearch('');
    setSearch('');
    setStatusFilter('');
    setDepartments([]);
    setPageError(null);
    setFormError(null);
    setSuccessMessage(null);
    setShowCreateForm(false);

    void loadFacilities();
  }, [
    organizationId,
    loadFacilities,
  ]);

  useEffect(() => {
    setPage(1);
    setDepartments([]);
    setPageError(null);
    setFormError(null);
    setSuccessMessage(null);
    setShowCreateForm(false);
  }, [selectedFacilityId]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  const resetCreateForm =
    (): void => {
      setCode('');
      setName('');
      setDescription('');
      setDepartmentStatus(
        'ACTIVE',
      );
      setFormError(null);
    };

  const handleCreateDepartment =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      event.preventDefault();

      setFormError(null);
      setSuccessMessage(null);

      if (!organizationId) {
        setFormError(
          'Select an active organization before creating a department.',
        );

        return;
      }

      if (!selectedFacilityId) {
        setFormError(
          'Select a facility before creating a department.',
        );

        return;
      }

      const normalizedCode =
        code.trim().toUpperCase();

      const normalizedName =
        name.trim();

      if (!normalizedCode) {
        setFormError(
          'Department code is required.',
        );

        return;
      }

      if (!normalizedName) {
        setFormError(
          'Department name is required.',
        );

        return;
      }

      const requestBody:
        CreateDepartmentRequest = {
        code: normalizedCode,
        name: normalizedName,
        status: departmentStatus,
      };

      const normalizedDescription =
        description.trim();

      if (normalizedDescription) {
        requestBody.description =
          normalizedDescription;
      }

      setSubmitting(true);

      try {
        await apiJson<Department>(
          `/organizations/${organizationId}/facilities/${selectedFacilityId}/departments`,
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

        resetCreateForm();

        setSuccessMessage(
          'Department created successfully.',
        );

        if (page !== 1) {
          setPage(1);
        } else {
          await loadDepartments();
        }
      } catch (
        requestError: unknown
      ) {
        setFormError(
          getErrorMessage(
            requestError,
            'Unable to create department.',
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

  const handleClearFilters =
    (): void => {
      setSearch('');
      setSubmittedSearch('');
      setStatusFilter('');
      setPage(1);
    };

  if (!organizationId) {
    return (
      <section className="department-page">
        <div className="department-empty-page">
          <div className="department-empty-icon">
            D
          </div>

          <p className="department-eyebrow">
            Administration
          </p>

          <h1>
            Select an organization
          </h1>

          <p>
            Choose an active organization
            before managing facilities and
            departments.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="department-page">
      {/* PAGE HEADER */}

      <header className="department-page-header">
        <div className="department-page-heading">
          <p className="department-eyebrow">
            Administration
          </p>

          <h1>Departments</h1>

          <p className="department-page-description">
            Manage clinical and
            administrative departments
            across your facilities.
          </p>
        </div>

        {canCreateDepartment && (
          <button
            type="button"
            className="department-primary-button"
            disabled={
              !selectedFacilityId
            }
            onClick={() => {
              setFormError(null);
              setSuccessMessage(null);

              setShowCreateForm(
                (current) =>
                  !current,
              );
            }}
          >
            <span
              className="department-button-icon"
              aria-hidden="true"
            >
              +
            </span>

            {showCreateForm
              ? 'Close form'
              : 'Add department'}
          </button>
        )}
      </header>

      {/* GLOBAL ERROR */}

      {pageError && (
        <div
          className="department-alert department-alert-error"
          role="alert"
        >
          <div>
            <strong>
              Something went wrong
            </strong>

            <span>{pageError}</span>
          </div>
        </div>
      )}

      {/* FACILITY CONTEXT */}

      <section className="department-context-card">
        <div className="department-context-main">
          <div className="department-context-copy">
            <span className="department-field-label">
              Facility
            </span>

            <p>
              Select the facility whose
              departments you want to
              manage.
            </p>
          </div>

          <div className="department-facility-control">
            <select
              id="department-facility"
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
          <div className="department-facility-summary">
            <div className="department-facility-avatar">
              {getInitials(
                selectedFacility.name,
              )}
            </div>

            <div className="department-facility-details">
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
                  ? ` • ${formatLabel(
                      selectedFacility.type,
                    )}`
                  : ''}
              </span>
            </div>

            <span className="department-context-status">
              <span
                className="department-context-status-dot"
                aria-hidden="true"
              />

              Active facility
            </span>
          </div>
        )}
      </section>

      {/* CREATE FORM */}

      {canCreateDepartment &&
        showCreateForm && (
          <section className="department-create-card">
            <div className="department-card-heading">
              <div>
                <p className="department-card-kicker">
                  New department
                </p>

                <h2>
                  Create department
                </h2>

                <p>
                  Add a new department to{' '}
                  <strong>
                    {selectedFacility?.name ??
                      'the selected facility'}
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                className="department-icon-button"
                aria-label="Close create department form"
                onClick={() => {
                  resetCreateForm();
                  setSuccessMessage(
                    null,
                  );
                  setShowCreateForm(
                    false,
                  );
                }}
              >
                ×
              </button>
            </div>

            {formError && (
              <div
                className="department-alert department-alert-error"
                role="alert"
              >
                <div>
                  <strong>
                    Department could not
                    be created
                  </strong>

                  <span>
                    {formError}
                  </span>
                </div>
              </div>
            )}

            {successMessage && (
              <div
                className="department-alert department-alert-success"
                role="status"
              >
                <div>
                  <strong>Success</strong>

                  <span>
                    {successMessage}
                  </span>
                </div>
              </div>
            )}

            <form
              className="department-create-form"
              onSubmit={(event) => {
                void handleCreateDepartment(
                  event,
                );
              }}
            >
              <div className="department-form-grid">
                <label
                  className="department-form-field"
                  htmlFor="department-code"
                >
                  <span>
                    Department code
                    <em>*</em>
                  </span>

                  <input
                    id="department-code"
                    type="text"
                    value={code}
                    maxLength={30}
                    placeholder="e.g. OPD"
                    autoComplete="off"
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    required
                    onChange={(
                      event,
                    ) => {
                      setCode(
                        event.target.value.toUpperCase(),
                      );
                    }}
                  />

                  <small>
                    A short unique code
                    used to identify the
                    department.
                  </small>
                </label>

                <label
                  className="department-form-field"
                  htmlFor="department-name"
                >
                  <span>
                    Department name
                    <em>*</em>
                  </span>

                  <input
                    id="department-name"
                    type="text"
                    value={name}
                    maxLength={150}
                    placeholder="e.g. Outpatient Department"
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    required
                    onChange={(
                      event,
                    ) => {
                      setName(
                        event.target.value,
                      );
                    }}
                  />

                  <small>
                    Use the official
                    clinical or
                    administrative name.
                  </small>
                </label>

                <label
                  className="department-form-field"
                  htmlFor="department-status"
                >
                  <span>
                    Initial status
                  </span>

                  <select
                    id="department-status"
                    value={
                      departmentStatus
                    }
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    onChange={(
                      event,
                    ) => {
                      setDepartmentStatus(
                        event.target
                          .value as DepartmentStatus,
                      );
                    }}
                  >
                    <option value="ACTIVE">
                      Active
                    </option>

                    <option value="INACTIVE">
                      Inactive
                    </option>
                  </select>

                  <small>
                    Inactive departments
                    remain registered but
                    unavailable for normal
                    use.
                  </small>
                </label>
              </div>

              <label
                className="department-form-field department-form-field-full"
                htmlFor="department-description"
              >
                <div className="department-field-heading">
                  <span>
                    Description
                  </span>

                  <span className="department-character-count">
                    {
                      description.length
                    }
                    /500
                  </span>
                </div>

                <textarea
                  id="department-description"
                  value={description}
                  maxLength={500}
                  rows={4}
                  placeholder="Add a short description of the department's role or services..."
                  disabled={
                    submitting ||
                    !selectedFacilityId
                  }
                  onChange={(
                    event,
                  ) => {
                    setDescription(
                      event.target.value,
                    );
                  }}
                />
              </label>

              <div className="department-form-footer">
                <button
                  type="button"
                  className="department-secondary-button"
                  disabled={submitting}
                  onClick={() => {
                    resetCreateForm();
                    setShowCreateForm(
                      false,
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="department-primary-button"
                  disabled={
                    submitting ||
                    !selectedFacilityId
                  }
                >
                  {submitting
                    ? 'Creating department…'
                    : 'Create department'}
                </button>
              </div>
            </form>
          </section>
        )}

      {!canCreateDepartment && (
        <div
          className="department-alert department-alert-info"
          role="status"
        >
          <div>
            <strong>
              View-only access
            </strong>

            <span>
              You can view departments
              but do not have permission
              to create new departments.
            </span>
          </div>
        </div>
      )}

      {/* DEPARTMENT LIST */}

      <section className="department-list-card">
        <div className="department-list-header">
          <div>
            <h2>
              Departments
            </h2>

            <p>
              {selectedFacility
                ? `Departments registered under ${selectedFacility.name}.`
                : 'Select a facility to view departments.'}
            </p>
          </div>

          <div className="department-total-badge">
            <strong>
              {meta.total}
            </strong>

            <span>
              {meta.total === 1
                ? 'record'
                : 'records'}
            </span>
          </div>
        </div>

        {/* FILTERS */}

        <form
          className="department-filter-toolbar"
          onSubmit={
            handleSearchSubmit
          }
        >
          <div className="department-search-control">
            <span
              className="department-search-symbol"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              id="department-search"
              type="search"
              aria-label="Search departments"
              value={search}
              placeholder="Search department code or name..."
              disabled={
                !selectedFacilityId
              }
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
              }}
            />
          </div>

          <select
            id="department-status-filter"
            className="department-status-filter"
            aria-label="Filter departments by status"
            value={statusFilter}
            disabled={
              !selectedFacilityId
            }
            onChange={(event) => {
              setStatusFilter(
                event.target
                  .value as
                  | DepartmentStatus
                  | '',
              );

              setPage(1);
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
          </select>

          <button
            type="submit"
            className="department-filter-button"
            disabled={
              !selectedFacilityId
            }
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="department-clear-button"
              disabled={
                !selectedFacilityId
              }
              onClick={
                handleClearFilters
              }
            >
              Clear filters
            </button>
          )}
        </form>

        {!selectedFacilityId ? (
          <div className="department-empty-state">
            <div className="department-empty-state-icon">
              F
            </div>

            <h3>
              Select a facility
            </h3>

            <p>
              Choose a facility above to
              view its registered
              departments.
            </p>
          </div>
        ) : departmentsLoading ? (
          <div
            className="department-loading-state"
            aria-live="polite"
          >
            <span className="department-spinner" />

            <div>
              <strong>
                Loading departments
              </strong>

              <p>
                Retrieving department
                records…
              </p>
            </div>
          </div>
        ) : departments.length ===
          0 ? (
          <div className="department-empty-state">
            <div className="department-empty-state-icon">
              D
            </div>

            <h3>
              No departments found
            </h3>

            <p>
              {hasActiveFilters
                ? 'No departments match the current search criteria.'
                : 'This facility does not have any departments yet.'}
            </p>

            {hasActiveFilters ? (
              <button
                type="button"
                className="department-secondary-button"
                onClick={
                  handleClearFilters
                }
              >
                Clear filters
              </button>
            ) : canCreateDepartment ? (
              <button
                type="button"
                className="department-primary-button"
                onClick={() => {
                  setShowCreateForm(
                    true,
                  );
                }}
              >
                + Add first department
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="department-table-wrapper">
              <table className="department-table">
                <thead>
                  <tr>
                    <th>
                      Department
                    </th>

                    <th>
                      Description
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Last updated
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {departments.map(
                    (department) => (
                      <tr
                        key={
                          department.id
                        }
                      >
                        <td>
                          <div className="department-identity">
                            <div className="department-code-avatar">
                              {getInitials(
                                department.name,
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  department.name
                                }
                              </strong>

                              <span>
                                {
                                  department.code
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="department-description-cell">
                          {department.description ? (
                            <span>
                              {
                                department.description
                              }
                            </span>
                          ) : (
                            <span className="department-muted">
                              No description
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`department-status department-status-${department.status.toLowerCase()}`}
                          >
                            <span
                              className="department-status-dot"
                              aria-hidden="true"
                            />

                            {formatLabel(
                              department.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="department-date-cell">
                            {formatDateTime(
                              department.updatedAt,
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <footer className="department-pagination">
              <p>
                Showing{' '}
                <strong>
                  {firstRecord}
                </strong>{' '}
                to{' '}
                <strong>
                  {lastRecord}
                </strong>{' '}
                of{' '}
                <strong>
                  {meta.total}
                </strong>{' '}
                departments
              </p>

              <div className="department-pagination-controls">
                <button
                  type="button"
                  className="department-pagination-button"
                  disabled={
                    departmentsLoading ||
                    page <= 1
                  }
                  onClick={() => {
                    setPage(
                      (
                        currentPage,
                      ) =>
                        Math.max(
                          currentPage -
                            1,
                          1,
                        ),
                    );
                  }}
                >
                  ← Previous
                </button>

                <span className="department-page-indicator">
                  Page{' '}
                  <strong>
                    {meta.page}
                  </strong>{' '}
                  of{' '}
                  <strong>
                    {Math.max(
                      meta.totalPages,
                      1,
                    )}
                  </strong>
                </span>

                <button
                  type="button"
                  className="department-pagination-button"
                  disabled={
                    departmentsLoading ||
                    meta.totalPages ===
                      0 ||
                    page >=
                      meta.totalPages
                  }
                  onClick={() => {
                    setPage(
                      (
                        currentPage,
                      ) =>
                        currentPage +
                        1,
                    );
                  }}
                >
                  Next →
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </section>
  );
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function formatDateTime(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
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

function getInitials(
  value: string,
): string {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'D';
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0][0] +
    words[1][0]
  ).toUpperCase();
}

function formatLabel(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}