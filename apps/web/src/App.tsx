import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router';
import './App.css';
import { PatientsPage } from './pages/PatientsPage';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { LoginPage } from './pages/LoginPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { RoomsPage } from './pages/RoomsPage';
import { StaffPage } from './pages/StaffPage';
import { PractitionersPage } from './pages/PractitionersPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="patients" element={<PatientsPage />} />
              <Route
                index
                element={<DashboardPage />}
              />

              <Route
                path="administration/facilities"
                element={<FacilitiesPage />}
              />
              <Route
                path="administration/departments"
                element={<DepartmentsPage />}
              />

              <Route
                path="administration/rooms"
                element={<RoomsPage />}
              />

              <Route
                path="administration/staff"
                element={<StaffPage />}
              />

              <Route
                path="administration/practitioners"
                element={<PractitionersPage />}
              />
            </Route>
            
          </Route>

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;