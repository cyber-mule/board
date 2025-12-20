export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export function withQuery(path: string, params: QueryParams = {}): string {
  const entries: Array<[string, string]> = [];

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          entries.push([key, String(item)]);
        }
      });
      return;
    }

    if (value !== undefined && value !== null && value !== '') {
      entries.push([key, String(value)]);
    }
  });

  if (entries.length === 0) {
    return path;
  }

  const query = new URLSearchParams(entries).toString();
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${query}`;
}
