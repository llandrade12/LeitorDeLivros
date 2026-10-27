"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { cx } from "@/lib/util";

export function BotaoEnviar({
  children,
  className,
  seta = true,
}: {
  children: React.ReactNode;
  className?: string;
  seta?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cx("btn-primario w-full", className)}>
      {pending ? <LoaderCircle size={18} className="animate-spin" /> : null}
      {children}
      {!pending && seta ? <ArrowRight size={16} /> : null}
    </button>
  );
}
