// schema.org JSON-LD for SEO — mirrors utilities' buildToolSchema so Google
// can surface aggregateRating snippets per game page.
export function buildGameSchema(
  gameName: string,
  url: string,
  ratingValue: number,
  ratingCount: number,
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: gameName,
    url,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
  if (ratingCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue,
      ratingCount,
      bestRating: '5',
      worstRating: '1',
    }
  }
  return schema
}
