import type { Metadata } from "next";
import {  Rubik, Rubik_Mono_One, Bricolage_Grotesque, Viga   } from "next/font/google";
import "./globals.css";
import FlowProvider from "@/Components/Providers/FlowProvider";
import ToastProvider from "@/Components/Toast/ToastProvider";
// import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

const rubikMonoOne = Rubik_Mono_One({
  weight: "400", // Only available weight for Rubik Mono One
  variable: "--font-rubik-mono-one",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
const viga = Viga({
  weight: "400", // Only available weight
  variable: "--font-viga",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FlowSense",
  description: "Flow blockchain wallet integration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${rubik.variable} ${rubikMonoOne.variable} ${bricolage.variable} ${viga.variable} antialiased`}
      >
        <FlowProvider>
          <ToastProvider>
            {children}
        {/* <ProgressBar
        height="4px"
        color="#00ef8b"
        options={{ showSpinner: false }}
        shallowRouting
      /> */}
          </ToastProvider>
        </FlowProvider>
      </body>
    </html>
  );
}
