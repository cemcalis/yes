'use client';

interface StructuredDataProps {
  data: Record<string, any>;
}

export default function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Helper functions to generate structured data

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'RAVOR',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://ravor.com',
    logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ravor.com'}/logo.png`,
    description: 'Minimal ve şık kadın giyim koleksiyonu. Zamansız tasarımlar.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+90-XXX-XXX-XXXX',
      contactType: 'Customer Service',
      availableLanguage: 'Turkish',
    },
    sameAs: [
      'https://facebook.com/ravor',
      'https://instagram.com/ravor',
      'https://twitter.com/ravor',
    ],
  };
}

export function generateProductSchema(product: any) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ravor.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.map((img: string) => img) || [product.image_url],
    sku: product.id.toString(),
    brand: {
      '@type': 'Brand',
      name: 'RAVOR',
    },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/urun/${product.slug}`,
      priceCurrency: 'TRY',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stock_status === 'in_stock'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    aggregateRating: product.avg_rating ? {
      '@type': 'AggregateRating',
      ratingValue: product.avg_rating,
      reviewCount: product.review_count || 0,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ravor.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

export function generateWebsiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ravor.com';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'RAVOR',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/arama?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateReviewSchema(review: any, product: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: product.name,
    },
    author: {
      '@type': 'Person',
      name: review.customer_name,
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.comment,
    datePublished: review.created_at,
  };
}
