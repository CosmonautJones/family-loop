export function safeUrl(value) {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '<invalid-url>';
  }
}

export function safeConsoleText(value) {
  return String(value)
    .replace(/https?:\/\/[^\s"'<>]+/g, (match) => safeUrl(match))
    .replace(/\bauthorization\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\r\n,;]+)/gi, 'authorization=<redacted>')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/\bBasic\s+[A-Za-z0-9+/=:_-]+/gi, 'Basic <redacted>')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '<redacted-jwt>')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/gi, '<redacted-supabase-key>')
    .replace(/\b(access[_ -]?token|refresh[_ -]?token|token|api[_ -]?key|apikey|authorization|password)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1=<redacted>');
}
