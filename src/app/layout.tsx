import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Curva ABC Online Grátis - Gerador de Análise de Pareto para Obras",
  description: "Ferramenta online gratuita para gerar Curva ABC (análise de Pareto) em orçamentos de obras. Ideal para engenheiros, orçamentistas e gestores. Sem cadastro.",
  keywords: "curva abc, análise de pareto, orçamento de obras, gestão de custos, construção civil, planilha sintética, classificação ABC, engenharia de custos, curva abc online, pareto obras",
  authors: [{ name: "Claudio Tools" }],
  openGraph: {
    title: "Curva ABC Online - Gerador Gratuito de Análise de Pareto",
    description: "Gere análises de Pareto para orçamentos de obras em segundos. Gratuito, sem cadastro, com exportação CSV e Excel.",
    type: "website",
    url: "https://curva-abc-app.vercel.app",
    siteName: "Claudio Tools",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Curva ABC Online - Análise de Pareto Grátis",
    description: "Gere Curva ABC para orçamentos de obras. Gratuito e sem cadastro.",
  },
  alternates: {
    canonical: "https://curva-abc-app.vercel.app",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Curva ABC Online - Análise de Pareto",
              "description": "Ferramenta online gratuita para gerar Curva ABC em orçamentos de obras.",
              "url": "https://curva-abc-app.vercel.app",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BRL"
              },
              "author": {
                "@type": "Organization",
                "name": "Claudio Tools"
              }
            }),
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
