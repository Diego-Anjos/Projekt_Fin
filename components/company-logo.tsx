"use client";

import { useEffect, useState } from "react";

const getServiceDomain = (serviceName: string) => {
  const name = serviceName.toLowerCase().trim();

  const domainMap: Record<string, string> = {
    netflix: "netflix.com",
    spotify: "spotify.com",
    amazon: "amazon.com",
    "amazon prime": "amazon.com",
    "prime video": "primevideo.com",
    crunchyroll: "crunchyroll.com",
    disney: "disneyplus.com",
    "disney+": "disneyplus.com",
    hbo: "hbomax.com",
    max: "max.com",
    "apple tv": "tv.apple.com",
    "apple music": "music.apple.com",
    youtube: "youtube.com",
    "youtube premium": "youtube.com",
    gympass: "wellhub.com",
    wellhub: "wellhub.com",
    "smart fit": "smartfit.com.br",
    chatgpt: "openai.com",
    github: "github.com",
    adobe: "adobe.com",
    microsoft: "microsoft.com",
  };

  return domainMap[name] || `${name.replace(/\s+/g, "")}.com`;
};

function logoUrl(name: string) {
  const domain = getServiceDomain(name);
  return `https://logo.clearbit.com/${domain}`;
}

function initialsAvatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff&size=128`;
}

export function CompanyLogo({ name }: { name: string }) {
  const srcUrl = logoUrl(name);
  const [src, setSrc] = useState(srcUrl);

  useEffect(() => {
    setSrc(srcUrl);
  }, [srcUrl]);

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={name}
      className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-900 object-cover"
      onError={(event) => {
        event.currentTarget.onerror = null;
        setSrc(initialsAvatarUrl(name));
      }}
    />
  );
}
