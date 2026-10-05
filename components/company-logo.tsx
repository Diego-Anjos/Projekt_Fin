"use client";

import { useState } from "react";

export function CompanyLogo({ name }: { name: string }) {
  const [hasError, setHasError] = useState(false);

  // Adivinha o domínio removendo espaços (ex: "Netflix" -> "netflix.com")
  const domain = name.toLowerCase().replace(/\s+/g, "") + ".com";

  // Usando a API do Google que é mais estável e não sofre tantos bloqueios de CORS
  const logoUrl = `https://s2.googleusercontent.com/s2/favicons?domain=${domain}&sz=128`;

  if (hasError) {
    return (
      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-200 font-bold text-sm border border-zinc-700">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={logoUrl}
      alt={name}
      className="w-10 h-10 rounded-full object-cover bg-zinc-900 border border-zinc-800"
      onError={() => setHasError(true)}
    />
  );
}
