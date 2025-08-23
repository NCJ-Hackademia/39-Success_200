import "./globals.css";

export const metadata = {
  title: "Urbi-Fix",
  description: "A platform for urban fixing and improvement",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
