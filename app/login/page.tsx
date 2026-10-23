import { redirect } from "next/navigation";

/** Alias legado: o ecrã de login vive em `/`. */
export default function LoginAliasPage() {
  redirect("/");
}
