import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';

import { apiJson } from '../api/api-client';
import { useAuth } from '../auth/useAuth';

interface Facility {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: string;
  status: string;
  city: string | null;
  phone: string | null;
}

interface FacilityListResponse {
  data: Facility[];

  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function FacilitiesPage() {
  const auth = useAuth();

  const organizationId =
    auth.user?.organizationId ?? null;

  const canCreate =
    auth.user?.permissions.includes(
      'facilities.create',
    ) ?? false;

  const [
    facilities,
    setFacilities,
  ] = useState<Facility[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

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
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    code,
    setCode,
  ] = useState('');

  const [
    name,
    setName,
  ] = useState('');

  const [
    city,
    setCity,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState('');

  const loadFacilities =
    useCallback(
      async (): Promise<void> => {
        if (!organizationId) {
          setFacilities([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        setPageError(null);

        try {
          const result =
            await apiJson<
              FacilityListResponse
            >(
              `/organizations/${organizationId}/facilities`,
            );

          setFacilities(
            Array.isArray(
              result.data,
            )
              ? result.data
              : [],
          );
        } catch (
          requestError: unknown
        ) {
          setFacilities([]);

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load facilities.',
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [organizationId],
    );

  useEffect(() => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setShowCreateForm(false);
    setPageError(null);
    setFormError(null);
    setSuccessMessage(null);

    void loadFacilities();
  }, [
    loadFacilities,
    organizationId,
  ]);

  const resetCreateForm =
    (): void => {
      setCode('');
      setName('');
      setCity('');
      setFormError(null);
    };

  const handleCreate = async (
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (
      !organizationId ||
      creating
    ) {
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    const normalizedCode =
      code.trim().toUpperCase();

    const normalizedName =
      name.trim();

    const normalizedCity =
      city.trim();

    if (!normalizedCode) {
      setFormError(
        'Facility code is required.',
      );

      return;
    }

    if (!normalizedName) {
      setFormError(
        'Facility name is required.',
      );

      return;
    }

    setCreating(true);

    try {
      await apiJson<Facility>(
        `/organizations/${organizationId}/facilities`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            code: normalizedCode,
            name: normalizedName,

            city:
              normalizedCity ||
              undefined,

            type: 'CLINIC',

            timezone:
              'America/Toronto',

            countryCode: 'CA',
          }),
        },
      );

      resetCreateForm();

      setSuccessMessage(
        'Facility created successfully.',
      );

      await loadFacilities();
    } catch (
      requestError: unknown
    ) {
      setFormError(
        getErrorMessage(
          requestError,
          'Unable to create facility.',
        ),
      );
    } finally {
      setCreating(false);
    }
  };

  const facilityTypes =
    useMemo(() => {
      return Array.from(
        new Set(
          facilities
            .map(
              (facility) =>
                facility.type,
            )
            .filter(Boolean),
        ),
      ).sort();
    }, [facilities]);

  const filteredFacilities =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return facilities.filter(
        (facility) => {
          const matchesSearch =
            !normalizedSearch ||
            facility.code
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            facility.name
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            facility.city
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            facility.phone
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesStatus =
            !statusFilter ||
            facility.status ===
              statusFilter;

          const matchesType =
            !typeFilter ||
            facility.type ===
              typeFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesType
          );
        },
      );
    }, [
      facilities,
      search,
      statusFilter,
      typeFilter,
    ]);

  const hasFilters =
    Boolean(
      search ||
        statusFilter ||
        typeFilter,
    );

  const clearFilters =
    (): void => {
      setSearch('');
      setStatusFilter('');
      setTypeFilter('');
    };

  if (!organizationId) {
    return (
      <section className="facility-page">
        <div className="facility-empty-page">
          <div className="facility-empty-icon">
            F
          </div>

          <p className="facility-eyebrow">
            Administration
          </p>

          <h1>
            Select an organization
          </h1>

          <p>
            Choose an active
            organization before managing
            its healthcare facilities.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="facility-page">
      {/* PAGE HEADER */}

      <header className="facility-page-header">
        <div className="facility-page-heading">
          <p className="facility-eyebrow">
            Administration
          </p>

          <h1>Facilities</h1>

          <p className="facility-page-description">
            Manage hospitals, clinics,
            laboratories and other
            healthcare locations within
            your organization.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="facility-primary-button"
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
              className="facility-button-icon"
              aria-hidden="true"
            >
              +
            </span>

            {showCreateForm
              ? 'Close form'
              : 'Add facility'}
          </button>
        )}
      </header>

      {/* PAGE ERROR */}

      {pageError && (
        <div
          className="facility-alert facility-alert-error"
          role="alert"
        >
          <div className="facility-alert-symbol">
            !
          </div>

          <div>
            <strong>
              Unable to load facilities
            </strong>

            <span>{pageError}</span>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {successMessage &&
        !showCreateForm && (
          <div
            className="facility-alert facility-alert-success"
            role="status"
          >
            <div className="facility-alert-symbol">
              ✓
            </div>

            <div>
              <strong>
                Facility created
              </strong>

              <span>
                {successMessage}
              </span>
            </div>
          </div>
        )}

      {/* CREATE FACILITY */}

      {canCreate &&
        showCreateForm && (
          <section className="facility-create-card">
            <div className="facility-card-heading">
              <div>
                <p className="facility-card-kicker">
                  New facility
                </p>

                <h2>
                  Create facility
                </h2>

                <p>
                  Register a new
                  healthcare facility
                  under the current
                  organization.
                </p>
              </div>

              <button
                type="button"
                className="facility-icon-button"
                aria-label="Close create facility form"
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
                className="facility-alert facility-alert-error"
                role="alert"
              >
                <div className="facility-alert-symbol">
                  !
                </div>

                <div>
                  <strong>
                    Facility could not
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
                className="facility-alert facility-alert-success"
                role="status"
              >
                <div className="facility-alert-symbol">
                  ✓
                </div>

                <div>
                  <strong>
                    Facility created
                  </strong>

                  <span>
                    {successMessage}
                  </span>
                </div>
              </div>
            )}

            <form
              className="facility-create-form"
              onSubmit={(event) => {
                void handleCreate(
                  event,
                );
              }}
            >
              <div className="facility-form-grid">
                <label
                  className="facility-form-field"
                  htmlFor="facility-code"
                >
                  <span>
                    Facility code
                    <em>*</em>
                  </span>

                  <input
                    id="facility-code"
                    type="text"
                    value={code}
                    maxLength={30}
                    placeholder="e.g. TOR-CLINIC"
                    autoComplete="off"
                    disabled={creating}
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
                    used throughout the
                    EMR.
                  </small>
                </label>

                <label
                  className="facility-form-field"
                  htmlFor="facility-name"
                >
                  <span>
                    Facility name
                    <em>*</em>
                  </span>

                  <input
                    id="facility-name"
                    type="text"
                    value={name}
                    maxLength={150}
                    placeholder="e.g. Toronto Medical Clinic"
                    disabled={creating}
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
                    name of the
                    healthcare location.
                  </small>
                </label>

                <label
                  className="facility-form-field"
                  htmlFor="facility-city"
                >
                  <span>City</span>

                  <input
                    id="facility-city"
                    type="text"
                    value={city}
                    maxLength={100}
                    placeholder="e.g. Toronto"
                    disabled={creating}
                    onChange={(
                      event,
                    ) => {
                      setCity(
                        event.target.value,
                      );
                    }}
                  />

                  <small>
                    Optional facility
                    location.
                  </small>
                </label>
              </div>

              {/* CURRENT DEFAULTS */}

              <div className="facility-default-config">
                <div className="facility-default-config-heading">
                  <span>
                    Default
                    configuration
                  </span>

                  <small>
                    Applied when this
                    facility is created
                  </small>
                </div>

                <div className="facility-config-items">
                  <div className="facility-config-item">
                    <span>Type</span>

                    <strong>
                      Clinic
                    </strong>
                  </div>

                  <div className="facility-config-item">
                    <span>
                      Country
                    </span>

                    <strong>
                      Canada
                    </strong>
                  </div>

                  <div className="facility-config-item">
                    <span>
                      Timezone
                    </span>

                    <strong>
                      America/Toronto
                    </strong>
                  </div>
                </div>
              </div>

              <div className="facility-form-footer">
                <button
                  type="button"
                  className="facility-secondary-button"
                  disabled={creating}
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
                  Cancel
                </button>

                <button
                  type="submit"
                  className="facility-primary-button"
                  disabled={creating}
                >
                  {creating
                    ? 'Creating facility…'
                    : 'Create facility'}
                </button>
              </div>
            </form>
          </section>
        )}

      {!canCreate && (
        <div
          className="facility-alert facility-alert-info"
          role="status"
        >
          <div className="facility-alert-symbol">
            i
          </div>

          <div>
            <strong>
              View-only access
            </strong>

            <span>
              You can view facilities,
              but you do not have
              permission to create new
              facilities.
            </span>
          </div>
        </div>
      )}

      {/* FACILITY LIST */}

      <section className="facility-list-card">
        <div className="facility-list-header">
          <div>
            <h2>
              Registered facilities
            </h2>

            <p>
              Healthcare locations
              registered under the
              current organization.
            </p>
          </div>

          <div className="facility-total-badge">
            <strong>
              {facilities.length}
            </strong>

            <span>
              {facilities.length === 1
                ? 'facility'
                : 'facilities'}
            </span>
          </div>
        </div>

        {/* FILTER TOOLBAR */}

        {facilities.length > 0 && (
          <div className="facility-filter-toolbar">
            <div className="facility-search-control">
              <span
                className="facility-search-symbol"
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                type="search"
                aria-label="Search facilities"
                value={search}
                placeholder="Search code, name, city or phone..."
                onChange={(event) => {
                  setSearch(
                    event.target.value,
                  );
                }}
              />
            </div>

            <select
              className="facility-filter-select"
              aria-label="Filter facilities by type"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(
                  event.target.value,
                );
              }}
            >
              <option value="">
                All facility types
              </option>

              {facilityTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {formatLabel(
                      type,
                    )}
                  </option>
                ),
              )}
            </select>

            <select
              className="facility-filter-select"
              aria-label="Filter facilities by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value,
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
            </select>

            {hasFilters && (
              <button
                type="button"
                className="facility-clear-button"
                onClick={
                  clearFilters
                }
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* DATA */}

        {loading ? (
          <div
            className="facility-loading-state"
            aria-live="polite"
          >
            <span className="facility-spinner" />

            <div>
              <strong>
                Loading facilities
              </strong>

              <p>
                Retrieving healthcare
                locations…
              </p>
            </div>
          </div>
        ) : facilities.length ===
          0 ? (
          <div className="facility-empty-state">
            <div className="facility-empty-state-icon">
              F
            </div>

            <h3>
              No facilities yet
            </h3>

            <p>
              No healthcare facilities
              have been registered for
              this organization.
            </p>

            {canCreate && (
              <button
                type="button"
                className="facility-primary-button"
                onClick={() => {
                  setShowCreateForm(
                    true,
                  );
                }}
              >
                + Add first facility
              </button>
            )}
          </div>
        ) : filteredFacilities.length ===
          0 ? (
          <div className="facility-empty-state">
            <div className="facility-empty-state-icon">
              ?
            </div>

            <h3>
              No matching facilities
            </h3>

            <p>
              No facilities match the
              current search or filter
              criteria.
            </p>

            <button
              type="button"
              className="facility-secondary-button"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="facility-table-wrapper">
              <table className="facility-table">
                <thead>
                  <tr>
                    <th>
                      Facility
                    </th>

                    <th>Type</th>

                    <th>
                      Location
                    </th>

                    <th>
                      Contact
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredFacilities.map(
                    (facility) => (
                      <tr
                        key={
                          facility.id
                        }
                      >
                        <td>
                          <div className="facility-identity">
                            <div className="facility-avatar">
                              {getInitials(
                                facility.name,
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  facility.name
                                }
                              </strong>

                              <span>
                                {
                                  facility.code
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="facility-type-label">
                            {formatLabel(
                              facility.type,
                            )}
                          </span>
                        </td>

                        <td>
                          {facility.city ? (
                            <div className="facility-location">
                              <span
                                className="facility-location-marker"
                                aria-hidden="true"
                              >
                                •
                              </span>

                              <span>
                                {
                                  facility.city
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="facility-muted">
                              Not specified
                            </span>
                          )}
                        </td>

                        <td>
                          {facility.phone ? (
                            <span className="facility-contact">
                              {
                                facility.phone
                              }
                            </span>
                          ) : (
                            <span className="facility-muted">
                              Not specified
                            </span>
                          )}
                        </td>

                        <td>
                          <FacilityStatusBadge
                            status={
                              facility.status
                            }
                          />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <footer className="facility-table-footer">
              <p>
                Showing{' '}
                <strong>
                  {
                    filteredFacilities.length
                  }
                </strong>{' '}
                of{' '}
                <strong>
                  {
                    facilities.length
                  }
                </strong>{' '}
                facilities
              </p>
            </footer>
          </>
        )}
      </section>
    </section>
  );
}

function FacilityStatusBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus =
    status.toLowerCase();

  return (
    <span
      className={`facility-status facility-status-${normalizedStatus}`}
    >
      <span
        className="facility-status-dot"
        aria-hidden="true"
      />

      {formatLabel(status)}
    </span>
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

function getInitials(
  value: string,
): string {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'F';
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