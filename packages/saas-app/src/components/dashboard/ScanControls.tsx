import { Radar, Pause, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ScanControlsProps {
  onLaunchScan: () => void;
  isScanning: boolean;
  lastScan: Date | null;
}

export function ScanControls({ onLaunchScan, isScanning, lastScan }: ScanControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 rounded-lg border border-border bg-card p-3 sm:p-4 flex-1">
      {/* Scan Button */}
      <Button
        variant={isScanning ? "tacticalAmber" : "tactical"}
        size="xl"
        onClick={onLaunchScan}
        disabled={isScanning}
        className="min-w-[140px] sm:min-w-[180px] text-sm sm:text-base"
      >
        {isScanning ? (
          <>
            <Pause className="h-5 w-5" />
            SCANNING...
          </>
        ) : (
          <>
            <Radar className="h-5 w-5" />
            LAUNCH SCAN
          </>
        )}
      </Button>

      {/* Scan Status */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">STATUS:</span>
          <Badge variant={isScanning ? "amber" : "tactical"}>
            {isScanning ? "ACTIVE" : "IDLE"}
          </Badge>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          Last scan: {lastScan ? lastScan.toLocaleTimeString() : "Never"}
        </div>
      </div>

      {/* Scan Animation */}
      {isScanning && (
        <div className="sm:ml-auto flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <div className="flex flex-col">
            <span className="font-mono text-sm text-primary">Processing...</span>
            <div className="h-1 w-24 sm:w-32 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse bg-primary" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
