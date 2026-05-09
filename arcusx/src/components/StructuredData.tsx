/**
 * StructuredData.tsx
 * Componente para agregar datos estructurados (JSON-LD) para SEO
 */

interface StructuredDataProps {
  type: string;
  data: Record<string, any>;
}

const StructuredData = ({ type, data }: StructuredDataProps) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  };
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
};

export default StructuredData;
