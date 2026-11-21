"use client";

import Link from "next/link";
import { CookieSettingsTrigger } from "@/components/cookie-consent";

export function LandingLegalLinks() {
  return (
  <>
    <Link href="/cookies" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
      Cookies
    </Link>
    <Link href="/contact" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
      Contact
    </Link>
    <CookieSettingsTrigger className="font-medium text-zinc-600 transition-colors hover:text-zinc-950" />
  </>
  );
}