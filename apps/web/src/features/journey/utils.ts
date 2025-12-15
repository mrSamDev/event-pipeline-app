const eventIcons: Record<string, string> = {
  session_start: '🚀',
  page_view: '👁️',
  search: '🔍',
  purchase: '💰',
  add_to_cart: '🛒',
  remove_from_cart: '❌',
  button_click: '👆',
  form_submit: '📝',
  video_play: '▶️',
  video_pause: '⏸️',
};

export function getEventIcon(eventType: string): string {
  return eventIcons[eventType] || '📌';
}

export function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
