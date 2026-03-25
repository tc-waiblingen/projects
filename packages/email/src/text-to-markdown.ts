export function textToMarkdown(text: string): string {
  return text
    .split('\n')
    .map(line => {
      // Strip redundant mailto duplicates: info@x.de<mailto:info@x.de> → info@x.de
      line = line.replace(/([^\s<]+)<mailto:\1>/g, '$1')

      // >> Label<URL> → [Label](URL)
      line = line.replace(/^>>\s*(.+?)<(https?:\/\/[^>]+)>$/, '[$1]($2)')

      // Inline Label<URL> → [Label](URL) (for remaining non-mailto angle-bracket URLs)
      line = line.replace(/([^\s<]+)<(https?:\/\/[^>]+)>/g, '[$1]($2)')

      // Normalize numbered list indentation: "  1.  Text" → "1. Text"
      line = line.replace(/^\s{1,4}(\d+)\.\s{2,}/, '$1. ')

      return line
    })
    .join('\n')
}
