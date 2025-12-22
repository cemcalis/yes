import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://siteniz.natro.com'; // Natro domain'inizi buraya yazın

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/hesap/',
          '/sepet/',
          '/odeme/',
          '/siparislerim/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
