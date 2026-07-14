import { useEffect, useState } from 'react';
import './App.css';

interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

function App() {
  const [health, setHealth] =
    useState<HealthResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHealth = async (): Promise<void> => {
      try {
        const response = await fetch(
          'http://localhost:3000/api/v1/health',
        );

        if (!response.ok) {
          throw new Error(
            `API returned status ${response.status}`,
          );
        }

        const data =
          (await response.json()) as HealthResponse;

        setHealth(data);
      } catch (requestError: unknown) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Unable to connect to the EMR API.';

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadHealth();
  }, []);

  return (
    <main className="page">
      <section className="status-card">
        <p className="eyebrow">EMR Platform</p>

        <h1>Development environment</h1>

        <p className="description">
          React frontend connected to the NestJS API and
          MySQL database.
        </p>

        {loading && (
          <div className="message">Checking services…</div>
        )}

        {error && (
          <div className="message error">
            <strong>Connection failed</strong>
            <span>{error}</span>
          </div>
        )}

        {health && (
          <dl className="status-grid">
            <div>
              <dt>API</dt>
              <dd>{health.service}</dd>
            </div>

            <div>
              <dt>Application status</dt>
              <dd>{health.status}</dd>
            </div>

            <div>
              <dt>Database</dt>
              <dd>{health.database}</dd>
            </div>

            <div>
              <dt>Checked at</dt>
              <dd>
                {new Date(
                  health.timestamp,
                ).toLocaleString()}
              </dd>
            </div>
          </dl>
        )}
      </section>
    </main>
  );
}

export default App;