import { useEffect } from 'react';
import { product } from './product';

function upsertMeta(name: string, content: string, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    if (property) element.setAttribute('property', name);
    else element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function usePageSeo(title: string, description: string, path: string, pageSchema?: Record<string, unknown>) {
  useEffect(() => {
    document.title = title;
    upsertMeta('description', description);
    upsertMeta('og:title', title, true);
    upsertMeta('og:description', description, true);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = new URL(path, window.location.origin).href;
    let data = document.getElementById('mapplock-structured-data') as HTMLScriptElement | null;
    if (!data) { data = document.createElement('script'); data.id = 'mapplock-structured-data'; data.type = 'application/ld+json'; document.head.appendChild(data); }
    data.text = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', name: product.developer, url: product.developerUrl, email: product.supportEmail, address: { '@type': 'PostalAddress', addressLocality: 'Bhopal', addressCountry: 'IN' } },
      { '@type': 'SoftwareApplication', name: product.fullName, applicationCategory: 'SecurityApplication', operatingSystem: 'Android', description: product.description, downloadUrl: product.playUrl, author: { '@type': 'Organization', name: product.developer } },
      ...(pageSchema ? [pageSchema] : []),
    ] });
  }, [title, description, path, pageSchema]);
}
