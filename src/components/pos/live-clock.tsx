"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Intl.DateTimeFormat("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour: "2-digit",
          minute: "2-digit",
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="tabular-nums text-xs font-medium text-mocha-400">
      {now || "\u00a0"}
    </span>
  );
}
