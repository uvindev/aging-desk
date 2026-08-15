"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { AnalyticsEvent } from "@/lib/analytics";
import { track } from "@/lib/analytics";

type IntentLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: AnalyticsEvent;
  children: ReactNode;
};

export function IntentLink({
  event,
  children,
  onClick,
  ...props
}: IntentLinkProps) {
  return (
    <a
      {...props}
      onClick={(click) => {
        track(event);
        onClick?.(click);
      }}
    >
      {children}
    </a>
  );
}
