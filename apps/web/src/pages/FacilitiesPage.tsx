import {
  useCallback,
  useEffect,
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

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  const organizationId = auth.user?.organizationId;

  const canCreate =
    auth.user?.permissions.includes('facilities.create') ?? false;

  const loadFacilities = useCallback(async (): Promise<void> => {
    if (!organizationId) {
      setFacilities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiJson<FacilityListResponse>(
        `/organizations/${organizationId}/facilities`,
      );

      setFacilities(result.data);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load facilities.',
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadFacilities();
  }, [loadFacilities]);

  const handleCreate = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!organizationId || creating) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await apiJson<Facility>(
        `/organizations/${organizationId}/facilities`,
        {
          method: 'POST',
          body: JSON.stringify({
            code,
            name,
            city: city.trim() || undefined,
            type: 'CLINIC',
            timezone: 'America/Toronto',
            countryCode: 'CA',
          }),
        },
      );

      setCode('');
      setName('');
      setCity('');

      await loadFacilities();
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create facility.',
      );
    } finally {
      setCreating(false);
    }
  };

  if (!organizationId) {
    return (
      <section className="empty-state">
        <h1>Facilities</h1>

        <p>
          Select an organization before managing its facilities.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>

          <h1>Facilities</h1>

          <p>
            Manage hospitals, clinics, laboratories, and organization
            branches.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {canCreate && (
        <form
          className="admin-form"
          onSubmit={(event) => {
            void handleCreate(event);
          }}
        >
          <h2>Create facility</h2>

          <div className="form-grid">
            <label>
              <span>Code</span>

              <input
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                }}
                maxLength={30}
                required
              />
            </label>

            <label>
              <span>Name</span>

              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                maxLength={150}
                required
              />
            </label>

            <label>
              <span>City</span>

              <input
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                }}
                maxLength={100}
              />
            </label>
          </div>

          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create facility'}
          </button>
        </form>
      )}

      <div className="data-card">
        <div className="data-card-header">
          <h2>Registered facilities</h2>

          <span>{facilities.length}</span>
        </div>

        {loading ? (
          <p>Loading facilities…</p>
        ) : facilities.length === 0 ? (
          <p>No facilities have been created.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id}>
                    <td>{facility.code}</td>
                    <td>{facility.name}</td>
                    <td>{facility.type}</td>
                    <td>{facility.city ?? '—'}</td>
                    <td>{facility.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}