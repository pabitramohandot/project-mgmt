import "./globals.css";
import NotificationProvider from "@/components/NotificationProvider";
import Script from "next/script";

export const metadata = {
  title: "Workspace Manager",
  description: "Manage projects and generate client invoices locally",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `
          }}
        />
      </head>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
