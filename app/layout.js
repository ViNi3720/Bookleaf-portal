import "./globals.css";
import Navbar from "./components/Navbar";
import { Suspense } from "react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
