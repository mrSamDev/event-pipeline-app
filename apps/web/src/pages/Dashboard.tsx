import { useNavigate } from "react-router-dom";
import { useStats } from "../features/analytics";
import type { EventByType } from "../features/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Loader } from "../components/Loader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: {error instanceof Error ? error.message : "Failed to load stats"}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/")}>
          <CardHeader>
            <CardTitle className="text-lg text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-600">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-gray-600">Avg Events/User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.avgEventsPerUser}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Events Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.eventsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString();
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#004747" strokeWidth={2} dot={{ fill: "#004747" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.eventsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tickFormatter={(value) => value.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip labelFormatter={(value) => value.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                <Bar dataKey="count" fill="#004747" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Most Common Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...stats.eventsByType]
                .sort((a: EventByType, b: EventByType) => b.count - a.count)
                .slice(0, 5)
                .map((item: EventByType) => (
                  <div key={item.type} className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">{item.type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                    <span className="text-gray-600">{item.count} events</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
