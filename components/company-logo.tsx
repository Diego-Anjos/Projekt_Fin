"use client";

const domainMap: Record<string, string> = {
  manual: "manual.com.br",
  "manual capilar": "manual.com.br",
  crunchyroll: "crunchyroll.com",
  netflix: "netflix.com",
  spotify: "spotify.com",
  amazon: "amazon.com",
  "amazon prime": "amazon.com",
  "prime video": "primevideo.com",
  disney: "disneyplus.com",
  "disney+": "disneyplus.com",
  hbo: "max.com",
  max: "max.com",
  apple: "apple.com",
  "apple tv": "tv.apple.com",
  "apple music": "music.apple.com",
  youtube: "youtube.com",
  "youtube premium": "youtube.com",
  deezer: "deezer.com",
  wellhub: "wellhub.com",
  gympass: "wellhub.com",
  smartfit: "smartfit.com.br",
  "smart fit": "smartfit.com.br",
  totalpass: "totalpass.com.br",
  chatgpt: "openai.com",
  openai: "openai.com",
  github: "github.com",
  adobe: "adobe.com",
  microsoft: "microsoft.com",
  notion: "notion.so",
  figma: "figma.com",
  canva: "canva.com",
  "google one": "google.com",
  icloud: "apple.com",
};

const domainAliases = Object.keys(domainMap).sort((left, right) => right.length - left.length);

const getServiceDomain = (serviceName: string): string => {
  const name = serviceName.toLowerCase().trim();
  const exactDomain = domainMap[name];

  if (exactDomain) {
    return exactDomain;
  }

  const alias = domainAliases.find((key) => name.includes(key));

  return alias ? domainMap[alias] : `${name.replace(/\s+/g, "")}.com`;
};

function duckDuckGoIconUrl(name: string) {
  return `https://icons.duckduckgo.com/ip3/${getServiceDomain(name)}.ico`;
}

function initialsAvatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff&bold=true&rounded=true`;
}

export function CompanyLogo({ name }: { name: string }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] p-2 ring-1 ring-white/10 backdrop-blur-sm transition-all group-hover:ring-emerald-500/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={duckDuckGoIconUrl(name)}
        src={duckDuckGoIconUrl(name)}
        alt={name}
        className="h-full w-full object-contain filter drop-shadow-sm"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = initialsAvatarUrl(name);
        }}
      />
    </div>
  );
}
