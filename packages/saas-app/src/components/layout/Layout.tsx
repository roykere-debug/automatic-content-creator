import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "rgb(var(--c-bg))" }}>
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Scrollable main content offset by sidebar width */}
      <main
        style={{
          flex: 1,
          marginLeft: 232,
          minHeight: "100vh",
          overflowY: "auto",
          backgroundColor: "rgb(var(--c-bg))",
        }}
      >
        {children}
      </main>
    </div>
  );
}
