/**
 * Cleans Yahoo RSS description strings which often contain tracking pixels or HTML links.
 */
export function cleanHtmlDescription(desc: string): string {
  if (!desc) return '';
  // Remove HTML tags
  let cleaned = desc.replace(/<\/?[^>]+(>|$)/g, "");
  // Remove Yahoo news sharing/tracking footer if present
  const footerIdx = cleaned.indexOf('Yahoo News');
  if (footerIdx !== -1) {
    cleaned = cleaned.substring(0, footerIdx);
  }
  return cleaned.trim();
}

/**
 * Formats standard pubDate RSS strings to a cleaner user-facing format.
 */
export function formatDateString(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (e) {
    return dateStr;
  }
}
