import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Curva ABC Online - Gerador Gratuito de Análise de Pareto",
  description: "Ferramenta online gratuita para gerar Curva ABC (análise de Pareto) em orçamentos de obras. Ideal para engenheiros, orçamentistas e gestores de projetos.",
  keywords: "curva abc, análise de pareto, orçamento de obras, gestão de custos, construção civil, planilha sintética, classificação ABC, engenharia de custos",
  authors: [{ name: "Claudio AI" }],
  openGraph: {
    title: "Curva ABC Online - Gerador Gratuito",
    description: "Gere análises de Pareto para orçamentos de obras em segundos. Gratuito, sem cadastro.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
