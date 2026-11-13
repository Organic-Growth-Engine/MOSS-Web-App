import Link from "next/link";

import { cn } from "@/lib/utils";
import { brand } from "@/config/brand";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary",
        className,
      )}
    >
      <span className="text-[10px] leading-none font-extrabold text-white">
        OG
      </span>
    </span>
  );
}

export function Logo({
  href = "/",
  className,
  markClassName,
}: {
  href?: string | null;
  className?: string;
  markClassName?: string;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="text-2xl font-normal tracking-tight text-foreground">
        {brand.name}
      </span>
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} aria-label={`${brand.name} home`} className="rounded-md">
      {content}
    </Link>
  );
}
