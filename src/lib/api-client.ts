export async function apiFetch(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Terjadi kesalahan");
  return json;
}
