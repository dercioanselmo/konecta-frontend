import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider, themeInitScript } from "@/lib/theme/ThemeProvider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KONECTA",
  description: "O que procura. A loja certa. O melhor preço.",
  icons: {
    icon: "/favicon_transparent_64x64.png",
    shortcut: "/favicon_transparent_64x64.png",
    apple: "/favicon_transparent_64x64.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-MZ" className={`${poppins.variable} dark h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
