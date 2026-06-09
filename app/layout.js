import "./globals.css";

export const metadata = {
  title: "Mid-Atlantic Singles Council Executive Dashboard",
  description: "SQL-backed executive decision-support dashboard for Mid-Atlantic single adult participation."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
