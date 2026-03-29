import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.appcorrespondencia.com.br'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard-master/',
          '/dashboard-admin/',
          '/dashboard-responsavel/',
          '/dashboard-porteiro/',
          '/dashboard-morador/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
