const allowedTags = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'hr',
  'span',
]);

const allowedAttributes: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
};

const safeProtocols = ['http:', 'https:', 'mailto:'];

function isSafeUrl(value: string): boolean {
  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
    const url = new URL(value, base);
    return safeProtocols.includes(url.protocol);
  } catch (error) {
    return false;
  }
}

export function sanitizeHtml(input: string): string {
  if (!input) {
    return '';
  }

  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') {
    return input;
  }

  const hasTags = /<[^>]+>/.test(input);
  if (!hasTags) {
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML.replace(/\n/g, '<br>');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const elements = Array.from(doc.body.querySelectorAll('*'));

  elements.forEach((element) => {
    const tag = element.tagName.toLowerCase();

    if (!allowedTags.has(tag)) {
      const parent = element.parentNode;
      if (parent) {
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
      }
      return;
    }

    const allowed = allowedAttributes[tag] ?? [];
    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        element.removeAttribute(attr.name);
        return;
      }
      if (!allowed.includes(name)) {
        element.removeAttribute(attr.name);
        return;
      }
      if (tag === 'a' && name === 'href' && !isSafeUrl(attr.value)) {
        element.removeAttribute(attr.name);
      }
    });
  });

  doc.querySelectorAll('a').forEach((anchor) => {
    if (anchor.getAttribute('target') === '_blank') {
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
}
