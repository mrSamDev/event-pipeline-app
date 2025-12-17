import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth";
import { Loader } from "./Loader";

export function ProtectedRoute({ children }: { children: ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader text="Loading..." />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
