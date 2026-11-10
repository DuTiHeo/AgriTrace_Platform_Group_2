import { useEffect } from "react";

export default function AdminToast({ message, clear }: { message: string; clear: (value: string) => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => clear(""), 4500);
    return () => window.clearTimeout(timer);
  }, [message, clear]);

  return <div className="admin-toast" role="status">{message}</div>;
}
