let DOMPurify: any = null;

async function getDOMPurify() {
  if (DOMPurify) return DOMPurify;
  
  try {
    // FIX: Renamed 'module' to 'dompurifyModule' to avoid conflict with a reserved variable name.
    const dompurifyModule = await import('dompurify');
    DOMPurify = dompurifyModule.default;
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
// FIX: Removed an extra closing brace from the end of the file.
