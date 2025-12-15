import { useParams, useNavigate } from "react-router-dom";
import { useUserJourney, getEventIcon, formatEventType } from "../features/journey";
import type { SessionGroup } from "../features/journey";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ArrowLeft } from "lucide-react";

export function UserJourney() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { data: sessions = [], isLoading, error } = useUserJourney(userId!);

  function renderPayload(payload: Record<string, unknown>) {
    if (!payload || Object.keys(payload).length === 0) return null;

    return (
      <div className="mt-2 text-sm text-gray-600">
        {Object.entries(payload).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium">{key}:</span>
            <span>{JSON.stringify(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading user journey...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error: {error instanceof Error ? error.message : "Failed to load user journey"}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={20} />
          Back to Users
        </button>
        <h1 className="text-3xl font-bold">User Journey</h1>
        <p className="text-gray-600 mt-2">User ID: {userId}</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">No events found for this user</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sessions.map((session: SessionGroup) => (
            <Card key={session.sessionId}>
              <CardHeader>
                <CardTitle className="text-xl">Session {session.sessionId.slice(0, 8)}...</CardTitle>
                <div className="text-sm text-gray-600">
                  <div>Started: {session.formattedStartTime}</div>
                  <div>Ended: {session.formattedEndTime}</div>
                  <div>{session.eventCount} events</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-[25px] top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-4">
                    {session.events.map((event) => (
                      <div key={event.eventId} className="relative flex gap-4">
                        <div className="shrink-0 w-12 h-12 rounded-full bg-[#004747]/10 flex items-center justify-center text-2xl z-10">{getEventIcon(event.type)}</div>

                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-lg">{formatEventType(event.type)}</div>
                              <div className="text-sm text-gray-500">{event.formattedTime}</div>
                            </div>
                          </div>
                          {renderPayload(event.payload)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
