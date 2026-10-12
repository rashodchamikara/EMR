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

type RoomStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'MAINTENANCE';

type RoomType =
  | 'CONSULTATION'
  | 'TREATMENT'
  | 'PROCEDURE'
  | 'WARD'
  | 'LABORATORY'
  | 'IMAGING'
  | 'PHARMACY'
  | 'OFFICE'
  | 'STORAGE'
  | 'OTHER';

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

interface Department {
  id: string;
  organizationId: string;
  facilityId: string;
  code: string;
  name: string;
  description: string | null;
  status: DepartmentStatus;
}

interface RoomDepartment {
  id: string;
  code: string;
  name: string;
}

interface Room {
  id: string;
  organizationId: string;
  facilityId: string;
  departmentId: string | null;
  code: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  floor: string | null;
  capacity: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  department: RoomDepartment | null;
}

interface FacilityListResponse {
  data: Facility[];
  meta: PaginationMeta;
}

interface DepartmentListResponse {
  data: Department[];
  meta: PaginationMeta;
}

interface RoomListResponse {
  data: Room[];
  meta: PaginationMeta;
}

interface CreateRoomRequest {
  departmentId?: string;
  code: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  floor?: string;
  capacity: number;
  notes?: string;
}

const PAGE_SIZE = 20;

const ROOM_TYPES: Array<{
  value: RoomType;
  label: string;
}> = [
  {
    value: 'CONSULTATION',
    label: 'Consultation',
  },
  {
    value: 'TREATMENT',
    label: 'Treatment',
  },
  {
    value: 'PROCEDURE',
    label: 'Procedure',
  },
  {
    value: 'WARD',
    label: 'Ward',
  },
  {
    value: 'LABORATORY',
    label: 'Laboratory',
  },
  {
    value: 'IMAGING',
    label: 'Imaging',
  },
  {
    value: 'PHARMACY',
    label: 'Pharmacy',
  },
  {
    value: 'OFFICE',
    label: 'Office',
  },
  {
    value: 'STORAGE',
    label: 'Storage',
  },
  {
    value: 'OTHER',
    label: 'Other',
  },
];

const ROOM_STATUSES: Array<{
  value: RoomStatus;
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
    value: 'MAINTENANCE',
    label: 'Maintenance',
  },
];

export function RoomsPage() {
  const auth = useAuth();

  const organizationId =
    auth.user?.organizationId ?? null;

  const permissions =
    auth.user?.permissions ?? [];

  const canCreateRoom =
    permissions.includes(
      'rooms.create',
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
    rooms,
    setRooms,
  ] = useState<Room[]>([]);

  const [
    facilitiesLoading,
    setFacilitiesLoading,
  ] = useState(false);

  const [
    departmentsLoading,
    setDepartmentsLoading,
  ] = useState(false);

  const [
    roomsLoading,
    setRoomsLoading,
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

  const [
    selectedDepartmentId,
    setSelectedDepartmentId,
  ] = useState('');

  const [
    code,
    setCode,
  ] = useState('');

  const [
    name,
    setName,
  ] = useState('');

  const [
    roomType,
    setRoomType,
  ] = useState<RoomType>(
    'CONSULTATION',
  );

  const [
    roomStatus,
    setRoomStatus,
  ] = useState<RoomStatus>(
    'ACTIVE',
  );

  const [
    floor,
    setFloor,
  ] = useState('');

  const [
    capacity,
    setCapacity,
  ] = useState('1');

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    submittedSearch,
    setSubmittedSearch,
  ] = useState('');

  const [
    departmentFilter,
    setDepartmentFilter,
  ] = useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<RoomType | ''>('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<RoomStatus | ''>('');

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    meta,
    setMeta,
  ] = useState<PaginationMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

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

  const selectedDepartment =
    useMemo(
      () =>
        departments.find(
          (department) =>
            department.id ===
            selectedDepartmentId,
        ) ?? null,
      [
        departments,
        selectedDepartmentId,
      ],
    );

  const hasActiveFilters =
    Boolean(
      submittedSearch ||
        departmentFilter ||
        typeFilter ||
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
          return;
        }

        setDepartmentsLoading(true);

        try {
          const response =
            await apiJson<
              DepartmentListResponse
            >(
              `/organizations/${organizationId}/facilities/${selectedFacilityId}/departments?page=1&limit=100&status=ACTIVE`,
            );

          const activeDepartments =
            Array.isArray(
              response.data,
            )
              ? response.data.filter(
                  (department) =>
                    department.status ===
                    'ACTIVE',
                )
              : [];

          setDepartments(
            activeDepartments,
          );

          setSelectedDepartmentId(
            (
              currentDepartmentId,
            ) => {
              const stillExists =
                activeDepartments.some(
                  (department) =>
                    department.id ===
                    currentDepartmentId,
                );

              return stillExists
                ? currentDepartmentId
                : '';
            },
          );

          setDepartmentFilter(
            (
              currentDepartmentId,
            ) => {
              const stillExists =
                activeDepartments.some(
                  (department) =>
                    department.id ===
                    currentDepartmentId,
                );

              return stillExists
                ? currentDepartmentId
                : '';
            },
          );
        } catch (
          requestError: unknown
        ) {
          setDepartments([]);
          setSelectedDepartmentId('');
          setDepartmentFilter('');

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
      ],
    );

  const loadRooms =
    useCallback(
      async (): Promise<void> => {
        if (
          !organizationId ||
          !selectedFacilityId
        ) {
          setRooms([]);

          setMeta({
            page: 1,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          });

          return;
        }

        setRoomsLoading(true);
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

          if (departmentFilter) {
            query.set(
              'departmentId',
              departmentFilter,
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

          const response =
            await apiJson<
              RoomListResponse
            >(
              `/organizations/${organizationId}/facilities/${selectedFacilityId}/rooms?${query.toString()}`,
            );

          setRooms(
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
          setRooms([]);

          setMeta({
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          });

          setPageError(
            getErrorMessage(
              requestError,
              'Unable to load rooms.',
            ),
          );
        } finally {
          setRoomsLoading(false);
        }
      },
      [
        organizationId,
        selectedFacilityId,
        page,
        submittedSearch,
        departmentFilter,
        typeFilter,
        statusFilter,
      ],
    );

  useEffect(() => {
    setFacilities([]);
    setSelectedFacilityId('');
    setDepartments([]);
    setRooms([]);

    setPage(1);
    setSearch('');
    setSubmittedSearch('');
    setDepartmentFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setShowCreateForm(false);

    setPageError(null);
    setFormError(null);
    setSuccessMessage(null);

    void loadFacilities();
  }, [
    organizationId,
    loadFacilities,
  ]);

  useEffect(() => {
    setDepartments([]);
    setRooms([]);

    setSelectedDepartmentId('');
    setDepartmentFilter('');

    setPage(1);
    setSearch('');
    setSubmittedSearch('');
    setTypeFilter('');
    setStatusFilter('');
    setShowCreateForm(false);

    setFormError(null);
    setSuccessMessage(null);

    void loadDepartments();
  }, [
    selectedFacilityId,
    loadDepartments,
  ]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const resetCreateForm =
    (): void => {
      setSelectedDepartmentId('');
      setCode('');
      setName('');
      setFloor('');
      setCapacity('1');
      setNotes('');

      setRoomType(
        'CONSULTATION',
      );

      setRoomStatus(
        'ACTIVE',
      );

      setFormError(null);
    };

  const handleCreateRoom =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ): Promise<void> => {
      event.preventDefault();

      setFormError(null);
      setSuccessMessage(null);

      if (!organizationId) {
        setFormError(
          'Select an active organization before creating a room.',
        );

        return;
      }

      if (!selectedFacilityId) {
        setFormError(
          'Select a facility before creating a room.',
        );

        return;
      }

      const normalizedCode =
        code.trim().toUpperCase();

      const normalizedName =
        name.trim();

      if (!normalizedCode) {
        setFormError(
          'Room code is required.',
        );

        return;
      }

      if (!normalizedName) {
        setFormError(
          'Room name is required.',
        );

        return;
      }

      const numericCapacity =
        Number(capacity);

      if (
        !Number.isInteger(
          numericCapacity,
        ) ||
        numericCapacity < 1 ||
        numericCapacity > 1000
      ) {
        setFormError(
          'Capacity must be a whole number between 1 and 1000.',
        );

        return;
      }

      const requestBody:
        CreateRoomRequest = {
        code: normalizedCode,
        name: normalizedName,
        type: roomType,
        status: roomStatus,
        capacity: numericCapacity,
      };

      if (selectedDepartmentId) {
        requestBody.departmentId =
          selectedDepartmentId;
      }

      const normalizedFloor =
        floor.trim();

      if (normalizedFloor) {
        requestBody.floor =
          normalizedFloor;
      }

      const normalizedNotes =
        notes.trim();

      if (normalizedNotes) {
        requestBody.notes =
          normalizedNotes;
      }

      setSubmitting(true);

      try {
        await apiJson<Room>(
          `/organizations/${organizationId}/facilities/${selectedFacilityId}/rooms`,
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
          'Room created successfully.',
        );

        if (page !== 1) {
          setPage(1);
        } else {
          await loadRooms();
        }
      } catch (
        requestError: unknown
      ) {
        setFormError(
          getErrorMessage(
            requestError,
            'Unable to create room.',
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
      setDepartmentFilter('');
      setTypeFilter('');
      setStatusFilter('');
      setPage(1);
    };

  if (!organizationId) {
    return (
      <section className="room-page">
        <div className="room-empty-page">
          <div className="room-empty-icon">
            R
          </div>

          <p className="room-eyebrow">
            Administration
          </p>

          <h1>
            Select an organization
          </h1>

          <p>
            Choose an active
            organization before managing
            rooms and operational
            locations.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="room-page">
      {/* PAGE HEADER */}

      <header className="room-page-header">
        <div className="room-page-heading">
          <p className="room-eyebrow">
            Administration
          </p>

          <h1>Rooms</h1>

          <p className="room-page-description">
            Manage consultation rooms,
            treatment areas, wards,
            laboratories and other
            operational spaces across
            your facilities.
          </p>
        </div>

        {canCreateRoom && (
          <button
            type="button"
            className="room-primary-button"
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
              className="room-button-icon"
              aria-hidden="true"
            >
              +
            </span>

            {showCreateForm
              ? 'Close form'
              : 'Add room'}
          </button>
        )}
      </header>

      {/* PAGE ERROR */}

      {pageError && (
        <div
          className="room-alert room-alert-error"
          role="alert"
        >
          <div className="room-alert-symbol">
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
        !showCreateForm && (
          <div
            className="room-alert room-alert-success"
            role="status"
          >
            <div className="room-alert-symbol">
              ✓
            </div>

            <div>
              <strong>
                Room created
              </strong>

              <span>
                {successMessage}
              </span>
            </div>
          </div>
        )}

      {/* FACILITY CONTEXT */}

      <section className="room-context-card">
        <div className="room-context-main">
          <div className="room-context-copy">
            <span className="room-field-label">
              Facility
            </span>

            <p>
              Select the facility whose
              rooms and operational
              spaces you want to manage.
            </p>
          </div>

          <div className="room-facility-control">
            <select
              id="room-facility"
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
          <div className="room-facility-summary">
            <div className="room-facility-avatar">
              {getInitials(
                selectedFacility.name,
              )}
            </div>

            <div className="room-facility-details">
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

            <span className="room-context-status">
              <span
                className="room-context-status-dot"
                aria-hidden="true"
              />

              Active facility
            </span>
          </div>
        )}
      </section>

      {/* CREATE ROOM */}

      {canCreateRoom &&
        showCreateForm && (
          <section className="room-create-card">
            <div className="room-card-heading">
              <div>
                <p className="room-card-kicker">
                  New room
                </p>

                <h2>
                  Create room
                </h2>

                <p>
                  Add an operational
                  space to{' '}
                  <strong>
                    {selectedFacility?.name ??
                      'the selected facility'}
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                className="room-icon-button"
                aria-label="Close create room form"
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
                className="room-alert room-alert-error"
                role="alert"
              >
                <div className="room-alert-symbol">
                  !
                </div>

                <div>
                  <strong>
                    Room could not be
                    created
                  </strong>

                  <span>
                    {formError}
                  </span>
                </div>
              </div>
            )}

            {successMessage && (
              <div
                className="room-alert room-alert-success"
                role="status"
              >
                <div className="room-alert-symbol">
                  ✓
                </div>

                <div>
                  <strong>Success</strong>

                  <span>
                    {successMessage}
                  </span>
                </div>
              </div>
            )}

            <form
              className="room-create-form"
              onSubmit={(event) => {
                void handleCreateRoom(
                  event,
                );
              }}
            >
              <div className="room-form-grid">
                <label
                  className="room-form-field"
                  htmlFor="room-code"
                >
                  <span>
                    Room code
                    <em>*</em>
                  </span>

                  <input
                    id="room-code"
                    type="text"
                    value={code}
                    maxLength={30}
                    placeholder="e.g. OPD-01"
                    autoComplete="off"
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    required
                    onChange={(event) => {
                      setCode(
                        event.target.value.toUpperCase(),
                      );
                    }}
                  />

                  <small>
                    A unique short code
                    used to identify this
                    room.
                  </small>
                </label>

                <label
                  className="room-form-field room-form-field-wide"
                  htmlFor="room-name"
                >
                  <span>
                    Room name
                    <em>*</em>
                  </span>

                  <input
                    id="room-name"
                    type="text"
                    value={name}
                    maxLength={150}
                    placeholder="e.g. Consultation Room 1"
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    required
                    onChange={(event) => {
                      setName(
                        event.target.value,
                      );
                    }}
                  />

                  <small>
                    Use the operational
                    name staff will
                    recognize.
                  </small>
                </label>

                <label
                  className="room-form-field"
                  htmlFor="room-type"
                >
                  <span>
                    Room type
                    <em>*</em>
                  </span>

                  <select
                    id="room-type"
                    value={roomType}
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    onChange={(event) => {
                      setRoomType(
                        event.target
                          .value as RoomType,
                      );
                    }}
                  >
                    {ROOM_TYPES.map(
                      (type) => (
                        <option
                          key={
                            type.value
                          }
                          value={
                            type.value
                          }
                        >
                          {type.label}
                        </option>
                      ),
                    )}
                  </select>

                  <small>
                    Defines the primary
                    clinical or
                    operational purpose.
                  </small>
                </label>

                <label
                  className="room-form-field"
                  htmlFor="room-department"
                >
                  <span>
                    Department
                  </span>

                  <select
                    id="room-department"
                    value={
                      selectedDepartmentId
                    }
                    disabled={
                      submitting ||
                      departmentsLoading ||
                      !selectedFacilityId
                    }
                    onChange={(event) => {
                      setSelectedDepartmentId(
                        event.target.value,
                      );
                    }}
                  >
                    <option value="">
                      No department
                    </option>

                    {departments.map(
                      (department) => (
                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          {
                            department.code
                          }{' '}
                          —{' '}
                          {
                            department.name
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <small>
                    Optional. Assign the
                    room to a clinical
                    department.
                  </small>
                </label>

                <label
                  className="room-form-field"
                  htmlFor="room-floor"
                >
                  <span>Floor</span>

                  <input
                    id="room-floor"
                    type="text"
                    value={floor}
                    maxLength={50}
                    placeholder="e.g. Ground Floor"
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    onChange={(event) => {
                      setFloor(
                        event.target.value,
                      );
                    }}
                  />

                  <small>
                    Building floor or
                    location level.
                  </small>
                </label>

                <label
                  className="room-form-field"
                  htmlFor="room-capacity"
                >
                  <span>
                    Capacity
                    <em>*</em>
                  </span>

                  <input
                    id="room-capacity"
                    type="number"
                    value={capacity}
                    min={1}
                    max={1000}
                    step={1}
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    required
                    onChange={(event) => {
                      setCapacity(
                        event.target.value,
                      );
                    }}
                  />

                  <small>
                    Maximum supported
                    occupancy or bed
                    capacity.
                  </small>
                </label>

                <label
                  className="room-form-field"
                  htmlFor="room-status"
                >
                  <span>
                    Initial status
                  </span>

                  <select
                    id="room-status"
                    value={roomStatus}
                    disabled={
                      submitting ||
                      !selectedFacilityId
                    }
                    onChange={(event) => {
                      setRoomStatus(
                        event.target
                          .value as RoomStatus,
                      );
                    }}
                  >
                    {ROOM_STATUSES.map(
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

                  <small>
                    Maintenance rooms
                    remain registered but
                    unavailable for normal
                    use.
                  </small>
                </label>
              </div>

              {selectedDepartment && (
                <div className="room-assignment-summary">
                  <span className="room-assignment-label">
                    Department assignment
                  </span>

                  <strong>
                    {
                      selectedDepartment.name
                    }
                  </strong>

                  <span>
                    {
                      selectedDepartment.code
                    }
                  </span>
                </div>
              )}

              <label
                className="room-form-field room-form-field-full"
                htmlFor="room-notes"
              >
                <div className="room-field-heading">
                  <span>Notes</span>

                  <span className="room-character-count">
                    {notes.length}/500
                  </span>
                </div>

                <textarea
                  id="room-notes"
                  value={notes}
                  maxLength={500}
                  rows={4}
                  placeholder="Add optional notes about equipment, accessibility, usage restrictions or other operational details..."
                  disabled={
                    submitting ||
                    !selectedFacilityId
                  }
                  onChange={(event) => {
                    setNotes(
                      event.target.value,
                    );
                  }}
                />
              </label>

              <div className="room-form-footer">
                <button
                  type="button"
                  className="room-secondary-button"
                  disabled={submitting}
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
                  className="room-primary-button"
                  disabled={
                    submitting ||
                    !selectedFacilityId
                  }
                >
                  {submitting
                    ? 'Creating room…'
                    : 'Create room'}
                </button>
              </div>
            </form>
          </section>
        )}

      {!canCreateRoom && (
        <div
          className="room-alert room-alert-info"
          role="status"
        >
          <div className="room-alert-symbol">
            i
          </div>

          <div>
            <strong>
              View-only access
            </strong>

            <span>
              You can view rooms, but
              you do not have permission
              to create new rooms.
            </span>
          </div>
        </div>
      )}

      {/* ROOM LIST */}

      <section className="room-list-card">
        <div className="room-list-header">
          <div>
            <h2>
              Registered rooms
            </h2>

            <p>
              {selectedFacility
                ? `Operational rooms and spaces registered under ${selectedFacility.name}.`
                : 'Select a facility to view its rooms.'}
            </p>
          </div>

          <div className="room-total-badge">
            <strong>
              {meta.total}
            </strong>

            <span>
              {meta.total === 1
                ? 'room'
                : 'rooms'}
            </span>
          </div>
        </div>

        {/* FILTER BAR */}

        <form
          className="room-filter-toolbar"
          onSubmit={
            handleSearchSubmit
          }
        >
          <div className="room-search-control">
            <span
              className="room-search-symbol"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              id="room-search"
              type="search"
              aria-label="Search rooms"
              value={search}
              placeholder="Search room code or name..."
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
            id="room-department-filter"
            className="room-filter-select room-department-filter"
            aria-label="Filter rooms by department"
            value={
              departmentFilter
            }
            disabled={
              !selectedFacilityId ||
              departmentsLoading
            }
            onChange={(event) => {
              setDepartmentFilter(
                event.target.value,
              );

              setPage(1);
            }}
          >
            <option value="">
              All departments
            </option>

            {departments.map(
              (department) => (
                <option
                  key={
                    department.id
                  }
                  value={
                    department.id
                  }
                >
                  {
                    department.code
                  }{' '}
                  —{' '}
                  {
                    department.name
                  }
                </option>
              ),
            )}
          </select>

          <select
            id="room-type-filter"
            className="room-filter-select"
            aria-label="Filter rooms by type"
            value={typeFilter}
            disabled={
              !selectedFacilityId
            }
            onChange={(event) => {
              setTypeFilter(
                event.target
                  .value as
                  | RoomType
                  | '',
              );

              setPage(1);
            }}
          >
            <option value="">
              All types
            </option>

            {ROOM_TYPES.map(
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

          <select
            id="room-status-filter"
            className="room-filter-select"
            aria-label="Filter rooms by status"
            value={statusFilter}
            disabled={
              !selectedFacilityId
            }
            onChange={(event) => {
              setStatusFilter(
                event.target
                  .value as
                  | RoomStatus
                  | '',
              );

              setPage(1);
            }}
          >
            <option value="">
              All statuses
            </option>

            {ROOM_STATUSES.map(
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

          <button
            type="submit"
            className="room-filter-button"
            disabled={
              !selectedFacilityId
            }
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="room-clear-button"
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

        {/* STATES */}

        {!selectedFacilityId ? (
          <div className="room-empty-state">
            <div className="room-empty-state-icon">
              F
            </div>

            <h3>
              Select a facility
            </h3>

            <p>
              Choose a facility above to
              view its registered rooms
              and operational spaces.
            </p>
          </div>
        ) : roomsLoading ? (
          <div
            className="room-loading-state"
            aria-live="polite"
          >
            <span className="room-spinner" />

            <div>
              <strong>
                Loading rooms
              </strong>

              <p>
                Retrieving room
                records…
              </p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="room-empty-state">
            <div className="room-empty-state-icon">
              R
            </div>

            <h3>
              No rooms found
            </h3>

            <p>
              {hasActiveFilters
                ? 'No rooms match the current search or filter criteria.'
                : 'This facility does not have any rooms registered yet.'}
            </p>

            {hasActiveFilters ? (
              <button
                type="button"
                className="room-secondary-button"
                onClick={
                  handleClearFilters
                }
              >
                Clear filters
              </button>
            ) : canCreateRoom ? (
              <button
                type="button"
                className="room-primary-button"
                onClick={() => {
                  setShowCreateForm(
                    true,
                  );
                }}
              >
                + Add first room
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="room-table-wrapper">
              <table className="room-table">
                <thead>
                  <tr>
                    <th>
                      Room
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Type
                    </th>

                    <th>
                      Location
                    </th>

                    <th>
                      Capacity
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
                  {rooms.map(
                    (room) => (
                      <tr
                        key={room.id}
                      >
                        <td>
                          <div className="room-identity">
                            <div className="room-avatar">
                              {getRoomTypeInitial(
                                room.type,
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  room.name
                                }
                              </strong>

                              <span>
                                {
                                  room.code
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {room.department ? (
                            <div className="room-department-cell">
                              <strong>
                                {
                                  room
                                    .department
                                    .name
                                }
                              </strong>

                              <span>
                                {
                                  room
                                    .department
                                    .code
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="room-muted">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="room-type-badge">
                            {formatEnumLabel(
                              room.type,
                            )}
                          </span>
                        </td>

                        <td>
                          {room.floor ? (
                            <div className="room-location-cell">
                              <span
                                className="room-location-dot"
                                aria-hidden="true"
                              />

                              <span>
                                {
                                  room.floor
                                }
                              </span>
                            </div>
                          ) : (
                            <span className="room-muted">
                              Not specified
                            </span>
                          )}
                        </td>

                        <td>
                          <div className="room-capacity-cell">
                            <strong>
                              {
                                room.capacity
                              }
                            </strong>

                            <span>
                              capacity
                            </span>
                          </div>
                        </td>

                        <td>
                          <RoomStatusBadge
                            status={
                              room.status
                            }
                          />
                        </td>

                        <td>
                          <span className="room-date-cell">
                            {formatDateTime(
                              room.updatedAt,
                            )}
                          </span>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <footer className="room-pagination">
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
                rooms
              </p>

              <div className="room-pagination-controls">
                <button
                  type="button"
                  className="room-pagination-button"
                  disabled={
                    roomsLoading ||
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

                <span className="room-page-indicator">
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
                  className="room-pagination-button"
                  disabled={
                    roomsLoading ||
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

function RoomStatusBadge({
  status,
}: {
  status: RoomStatus;
}) {
  return (
    <span
      className={`room-status room-status-${status.toLowerCase()}`}
    >
      <span
        className="room-status-dot"
        aria-hidden="true"
      />

      {formatEnumLabel(status)}
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

function getRoomTypeInitial(
  type: RoomType,
): string {
  switch (type) {
    case 'CONSULTATION':
      return 'C';

    case 'TREATMENT':
      return 'T';

    case 'PROCEDURE':
      return 'P';

    case 'WARD':
      return 'W';

    case 'LABORATORY':
      return 'L';

    case 'IMAGING':
      return 'I';

    case 'PHARMACY':
      return 'Rx';

    case 'OFFICE':
      return 'O';

    case 'STORAGE':
      return 'S';

    default:
      return 'R';
  }
}