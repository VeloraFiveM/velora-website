const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
const discord =
  (import.meta.env.VITE_DISCORD_INVITE as string | undefined) ??
  "https://discord.gg/nhbeyrGcJS";
const code = import.meta.env.VITE_FIVEM_CONNECT_CODE as string | undefined;
export const config = {
  apiUrl:
    apiUrl && /^https?:\/\//.test(apiUrl) ? apiUrl.replace(/\/$/, "") : null,
  discord:
    discord && /^https:\/\/discord\.(gg\/|com\/invite\/)[\w-]+$/.test(discord)
      ? discord
      : null,
  connect:
    code && /^[a-z0-9]{5,12}$/i.test(code)
      ? `https://cfx.re/join/${code}`
      : null,
};
