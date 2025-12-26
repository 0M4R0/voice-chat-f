// App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Register } from "./pages/Register";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/useAuth";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? <Navigate to="/channels/me" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/channels/me" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={user ? <Navigate to="/channels/me" replace /> : <Register />}
      />

      <Route
        path="/channels/me"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
