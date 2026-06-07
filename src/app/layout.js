import "./globals.css";
import NotificationProvider from "@/components/NotificationProvider";

export const metadata = {
  title: "IONETWEB Project Manager",
  description: "Manage projects and generate client invoices locally",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
