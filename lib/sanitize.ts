let DOMPurify: any = null;

async function getDOMPurify() {
  if (DOMPurify) return DOMPurify;
  
  try {
    // This is the correct, modern way to import the module.
    const module = await import('dompurify');
    DOMPurify = module.default;
    return DOMPurify;
  } catch (error) {
    console.warn('Failed to load DOMPurify:', error);
    return null;
  }
}

export async function sanitizeHtml(html: string): Promise<string> {
  const purify = await getDOMPurify();
  
  if (!purify) {
    // Fallback: strip all HTML tags
    return html.replace(/<[^>]*>/g, '');
  }
  
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
}
