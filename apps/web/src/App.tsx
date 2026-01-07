import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BarChart3, LogOut, Users } from "lucide-react";
import {
	BrowserRouter,
	Link,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Button } from "./components/ui/button";
import { AuthProvider, useAuth } from "./features/auth";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { SignUp } from "./pages/SignUp";
import { UserJourney } from "./pages/UserJourney";
import { UsersOverview } from "./pages/UsersOverview";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60000,
			retry: 1,
		},
	},
});

function Navigation() {
	const location = useLocation();
	const { logout, isAuthenticated } = useAuth();

	const isAuthPage =
		location.pathname === "/login" || location.pathname === "/signup";

	if (!isAuthenticated || isAuthPage) return null;

	async function handleLogout() {
		try {
			await logout();
			window.location.href = "/login";
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}

	return (
		<nav className="bg-white border-b border-gray-200">
			<div className="container mx-auto px-6 py-4 max-w-7xl">
				<div className="flex items-center justify-between">
					<div>
						<div className="text-2xl font-bold text-[#004747]">Veritas</div>
						<div className="text-xs text-gray-500">
							See the truth about your customers
						</div>
					</div>
					<div className="flex items-center gap-6">
						<Link
							to="/dashboard"
							className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
								location.pathname === "/dashboard"
									? "bg-[#004747]/10 text-[#004747]"
									: "text-gray-600 hover:bg-gray-100"
							}`}
						>
							<BarChart3 size={20} />
							Dashboard
						</Link>
						<Link
							to="/"
							className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
								location.pathname === "/"
									? "bg-[#004747]/10 text-[#004747]"
									: "text-gray-600 hover:bg-gray-100"
							}`}
						>
							<Users size={20} />
							Users
						</Link>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleLogout}
							className="flex items-center gap-2"
						>
							<LogOut size={18} />
							Logout
						</Button>
					</div>
				</div>
			</div>
		</nav>
	);
}

function AppRoutes() {
	return (
		<Routes>
			<Route path="/login" element={<Login />} />
			<Route path="/signup" element={<SignUp />} />
			<Route
				path="/"
				element={
					<ProtectedRoute>
						<UsersOverview />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/users/:userId/journey"
				element={
					<ProtectedRoute>
						<UserJourney />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/dashboard"
				element={
					<ProtectedRoute>
						<Dashboard />
					</ProtectedRoute>
				}
			/>
			<Route path="*" element={<Navigate to="/dashboard" replace />} />
		</Routes>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AuthProvider>
					<div className="min-h-screen bg-gray-50 flex flex-col">
						<Navigation />
						<div className="flex-1">
							<AppRoutes />
						</div>
						<Footer />
					</div>
				</AuthProvider>
			</BrowserRouter>
		</QueryClientProvider>
	);
}

export default App;
