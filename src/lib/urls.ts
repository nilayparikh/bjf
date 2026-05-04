const baseUrl = import.meta.env.BASE_URL ?? "/";

export function withBase(value: string | undefined) {
  if (!value) {
    return value;
  }

  if (/^(https?:|mailto:|tel:|#)/.test(value)) {
    return value;
  }

  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanValue = value.startsWith("/") ? value : `/${value}`;

  if (cleanValue === "/") {
    return baseUrl;
  }

  return `${cleanBase}${cleanValue}`;
}
