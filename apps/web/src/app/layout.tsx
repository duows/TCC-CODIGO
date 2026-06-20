import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Sistema Especialista de Compatibilidade de Hardware',
  description: 'Validação de compatibilidade de hardware baseada em CSP/AC-3',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen flex flex-col">
        {children}
        <footer className="border-t border-[#E5E5EA] py-8">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-32 text-center space-y-1">
            <p className="text-xs text-[#AEAEB2] leading-relaxed">
              TCC — Sistema Especialista Educacional para Validação de Compatibilidade de Hardware
              baseado em Problema de Satisfação de Restrições (CSP).
            </p>
            <p className="text-xs text-[#AEAEB2]">
              Desenvolvido por Henrique José de Souza — IFSP - Birigui &nbsp;·&nbsp; Orientadora: Profa. Dra. Helen de Freitas Santos
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
