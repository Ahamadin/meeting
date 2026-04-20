import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
export default function PrivateRoute({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}
