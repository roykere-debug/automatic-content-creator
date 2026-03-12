import { Radar, Pause, RefreshCw, Clock } from "lucide-react";

interface ScanControlsProps {
  onLaunchScan: () => void;
  isScanning: boolean;
  lastScan: Date | null;
}

export function ScanControls({ onLaunchScan, isScanning, lastScan }: ScanControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        backgroundColor: "rgb(var(--c-surface))",
        border: "1px solid rgb(var(--c-border))",
        borderRadius: "var(--radius)",
        padding: "14px 18px",
      }}
    >
      {/* Scan button */}
      <button
        onClick={onLaunchScan}
        disabled={isScanning}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 18px",
          borderRadius: "calc(var(--radius) - 2px)",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.03em",
          cursor: isScanning ? "not-allowed" : "pointer",
          border: "none",
          backgroundColor: isScanning ? "rgba(255,175,0,0.12)" : "rgb(var(--c-primary))",
          color: isScanning ? "rgb(var(--c-amber))" : "#fff",
          opacity: isScanning ? 0.8 : 1,
          transition: "all 150ms ease",
          minWidth: 148,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {isScanning ? (
          <>
            <Pause size={14} />
            Scanning…
          </>
        ) : (
          <>
            <Radar size={14} />
            Launch scan
          </>
        )}
      </button>

      {/* Status */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "rgb(var(--c-fg-muted))",
            }}
          >
            Status:
          </span>
          <span
            className="pill"
            style={
              isScanning
                ? { backgroundColor: "rgba(255,175,0,0.1)", color: "rgb(var(--c-amber))", fontSize: 10 }
                : { backgroundColor: "rgb(var(--c-surface-2))", color: "rgb(var(--c-fg-muted))", border: "1px solid rgb(var(--c-border))", fontSize: 10 }
            }
          >
            {isScanning ? "ACTIVE" : "IDLE"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "rgb(var(--c-fg-muted))",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <Clock size={10} />
          {lastScan ? `Last: ${lastScan.toLocaleTimeString()}` : "Never scanned"}
        </div>
      </div>

      {/* Active spinner */}
      {isScanning && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <RefreshCw
            size={16}
            style={{ color: "rgb(var(--c-primary))", animation: "spin 1s linear infinite" }}
          />
          <div>
            <div style={{ fontSize: 12, color: "rgb(var(--c-primary))", fontWeight: 500 }}>
              Processing…
            </div>
            <div
              style={{
                height: 2,
                width: 120,
                backgroundColor: "rgb(var(--c-surface-2))",
                borderRadius: 4,
                marginTop: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: "50%",
                  backgroundColor: "rgb(var(--c-primary))",
                  animation: "pulse 1s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
