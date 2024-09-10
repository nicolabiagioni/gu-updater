"use client";

import Link from "next/link";
import { FaDiscord, FaGlobe, FaSpotify, FaXTwitter } from "react-icons/fa6";
import { SiOpensea } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="w-full py-6 bg-background border-t border-border">
      <div className="container mx-auto px-4">
        <nav className="flex justify-center space-x-6" aria-label="Social media links">
          {[
            { href: "https://www.genuineundead.com/", icon: FaGlobe, label: "Genuine Undead Website" },
            { href: "https://discord.gg/genuineundead", icon: FaDiscord, label: "Genuine Undead Discord" },
            { href: "https://x.com/GenuinelyUndead", icon: FaXTwitter, label: "Genuine Undead on X (Twitter)" },
            { href: "https://open.spotify.com/user/1168050140", icon: FaSpotify, label: "Genuine Undead on Spotify" },
            { href: "https://opensea.io/collection/genuine-undead-v2", icon: SiOpensea, label: "Genuine Undead on OpenSea" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={label}
              href={href}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="sr-only">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
