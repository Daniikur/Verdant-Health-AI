import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/notifications");
      setItems(r.data);
    } catch (e) {
      // silently ignore — user may be unauthenticated
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const unread = items.filter((i) => !i.read).length;

  const markAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="notifications-bell"
          className="relative rounded-full h-9 w-9 flex items-center justify-center hover:bg-secondary"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-terra" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="text-sm font-medium">Notifications</div>
          <button onClick={markAll} className="text-xs text-muted-foreground hover:text-foreground" data-testid="notifications-mark-all">
            Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-3 border-b last:border-0 ${n.read ? "" : "bg-secondary/40"}`}
              data-testid={`notification-${n.id}`}
            >
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
