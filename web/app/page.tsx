"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStatus, setMode, type Status } from "../lib/api";

type Stage = {
  id: number;
  title: string;
  rom: string;
  maxAngle: number;
  desc: string;
  color: string;
};

const RETURN_STAGE: Stage = {
  id: 4,
  title: "Return to Zero",
  rom: "→ 0°",
  maxAngle: 0,
  desc: "Drive the brace back to its neutral home position.",
  color: "rgb(142, 142, 147)",
};

const STAGES: Stage[] = [
  {
    id: 0,
    title: "Immobilization",
    rom: "0 – 30°",
    maxAngle: 30,
    desc: "Protect the repair. Strictly limit flexion to prevent stress on healing tissue.",
    color: "rgb(255, 59, 48)",
  },
  {
    id: 1,
    title: "Early Motion",
    rom: "0 – 60°",
    maxAngle: 60,
    desc: "Begin gradual, controlled flexion. Monitor comfort and swelling response.",
    color: "rgb(255, 149, 0)",
  },
  {
    id: 2,
    title: "Mid Recovery",
    rom: "0 – 90°",
    maxAngle: 90,
    desc: "Increase tolerance and range. Progressive loading as tissue adapts.",
    color: "rgb(0, 122, 255)",
  },
  {
    id: 3,
    title: "Full ROM",
    rom: "0 – 120°+",
    maxAngle: 120,
    desc: "Work toward patient-specific targets. Prepare for return to activity.",
    color: "rgb(52, 199, 89)",
  },
];

type Toast = { kind: "success" | "error"; message: string; id: number };

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [pendingStage, setPendingStage] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pollRef = useRef<number | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getStatus();
      setStatus(s);
    } catch {
      setStatus({
        connected: false,
        port: null,
        stage: null,
        error: "Cannot reach server on :3001",
      });
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    pollRef.current = window.setInterval(refreshStatus, 2000);
    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, [refreshStatus]);

  const pushToast = (kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { kind, message, id }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 3000);
  };

  const handleSelect = (stage: number) => {
    setSelectedStage(stage);
  };

  const handleApply = async () => {
    if (selectedStage === null || !status?.connected || pendingStage !== null) return;
    setPendingStage(selectedStage);
    try {
      await setMode(selectedStage);
      pushToast(
        "success",
        selectedStage === RETURN_STAGE.id
          ? "Returning to zero"
          : `Stage ${selectedStage} activated`
      );
      await refreshStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      pushToast("error", message);
    } finally {
      setPendingStage(null);
    }
  };

  const connected = !!status?.connected;
  const activeStage = status?.stage ?? null;
  const activeData =
    activeStage !== null && activeStage >= 0 && activeStage < STAGES.length
      ? STAGES[activeStage]
      : null;
  const selectedLabel =
    selectedStage === RETURN_STAGE.id
      ? RETURN_STAGE.title
      : selectedStage !== null
      ? `Stage ${selectedStage}`
      : null;

  return (
    <div className="flex flex-col md:flex-row">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgb(var(--accent) / 0.1)" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(0,122,255)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2v6a6 6 0 0 0 12 0V2" />
                <path d="M6 22v-6a6 6 0 0 1 12 0v6" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              KneeUnilateralRetractor
            </span>
          </div>
        </div>

        {/* Connection status */}
        <div className="px-6 mb-6">
          <ConnectionStatus status={status} />
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-black/[0.06]" />

        {/* Stage label */}
        <div className="px-6 pt-5 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/40">
            Stages
          </span>
        </div>

        {/* Stage list */}
        <nav className="flex-1 px-4 pb-4 overflow-y-auto">
          {STAGES.map((stage) => {
            const isActive = activeStage === stage.id;
            const isSelected = selectedStage === stage.id;

            return (
              <button
                key={stage.id}
                onClick={() => handleSelect(stage.id)}
                className={`stage-item w-full text-left mb-1 ${
                  isSelected ? "active" : ""
                } ${!connected ? "disabled" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      background: isSelected || isActive ? stage.color : "rgba(0,0,0,0.12)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="stage-title text-[14px] font-medium leading-tight">
                        {stage.title}
                      </span>
                    </div>
                    <span className="text-[12px] text-black/40 leading-tight">
                      {stage.rom}
                    </span>
                  </div>
                  {isActive && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgb(52, 199, 89)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Return-to-zero (sidebar-only) */}
        <div className="px-4 pb-2">
          <div className="mx-2 mb-2 border-t border-black/[0.06]" />
          {(() => {
            const isSelected = selectedStage === RETURN_STAGE.id;
            return (
              <button
                onClick={() => handleSelect(RETURN_STAGE.id)}
                className={`stage-item w-full text-left ${
                  isSelected ? "active" : ""
                } ${!connected ? "disabled" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      background: isSelected ? RETURN_STAGE.color : "transparent",
                      border: isSelected
                        ? "none"
                        : "1.5px solid rgba(0,0,0,0.2)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="stage-title text-[14px] font-medium leading-tight">
                      {RETURN_STAGE.title}
                    </span>
                    <span className="block text-[12px] text-black/40 leading-tight">
                      {RETURN_STAGE.rom}
                    </span>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <polyline points="3 4 3 10 9 10" />
                  </svg>
                </div>
              </button>
            );
          })()}
        </div>

        {/* Apply button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleApply}
            disabled={
              selectedStage === null ||
              !connected ||
              pendingStage !== null ||
              selectedStage === activeStage
            }
            className="w-full py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all"
            style={{
              background:
                selectedStage !== null && connected && pendingStage === null && selectedStage !== activeStage
                  ? "rgb(0, 122, 255)"
                  : "rgba(0,0,0,0.1)",
              cursor:
                selectedStage !== null && connected && pendingStage === null && selectedStage !== activeStage
                  ? "pointer"
                  : "not-allowed",
              color:
                selectedStage !== null && connected && pendingStage === null && selectedStage !== activeStage
                  ? "#fff"
                  : "rgba(0,0,0,0.3)",
            }}
          >
            {pendingStage !== null ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />{" "}
                {pendingStage === RETURN_STAGE.id ? "Returning..." : "Applying..."}
              </span>
            ) : selectedStage !== null && selectedStage !== activeStage ? (
              selectedStage === RETURN_STAGE.id
                ? "Return to Zero"
                : `Apply ${selectedLabel}`
            ) : (
              "Select a stage"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06]">
          <p className="text-[11px] text-black/30 leading-relaxed">
            Validate transitions against the clinician&apos;s prescription.
          </p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content">
        <div className="max-w-2xl mx-auto px-8 md:px-16 py-12 md:py-20">
          {/* Header */}
          <div className="animate-fade-up">
            <h1 className="text-[32px] md:text-[40px] font-semibold tracking-tight leading-[1.1] text-black/90">
              Recovery Control
            </h1>
            <p className="mt-3 text-[16px] text-black/45 leading-relaxed max-w-md">
              Select a stage from the sidebar, then press Apply to
              update the brace&apos;s range of motion.
            </p>
          </div>

          {/* Active stage detail card */}
          <div
            className="mt-12 animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            {activeData ? (
              <ActiveStageCard stage={activeData} />
            ) : (
              <EmptyState connected={connected} error={status?.error} />
            )}
          </div>

          {/* All stages overview */}
          <div
            className="mt-14 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-black/35 mb-5">
              All Stages
            </h2>
            <div className="space-y-3">
              {STAGES.map((stage) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  isActive={activeStage === stage.id}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── Toasts ── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ConnectionStatus({ status }: { status: Status | null }) {
  if (!status) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-black/15" />
        <span className="text-[13px] text-black/40">Connecting...</span>
      </div>
    );
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 h-2 rounded-full status-pulse"
          style={{ background: "rgb(52, 199, 89)" }}
        />
        <span className="text-[13px] text-black/60 font-medium">
          Connected
        </span>
        <span className="text-[12px] text-black/30 font-mono">
          {status.port}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: "rgb(255, 59, 48)" }}
      />
      <span className="text-[13px] text-black/50 font-medium">
        Disconnected
      </span>
    </div>
  );
}

function ActiveStageCard({ stage }: { stage: Stage }) {
  const pct = Math.round((stage.maxAngle / 120) * 100);

  return (
    <div
      className="rounded-2xl p-8 md:p-10"
      style={{
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-black/35 mb-1">
            Active Stage
          </p>
          <h3 className="text-[26px] font-semibold tracking-tight leading-tight">
            {stage.title}
          </h3>
        </div>
        <div
          className="text-[36px] font-semibold tracking-tight"
          style={{ color: stage.color }}
        >
          {stage.rom.split("–")[1]?.trim() ?? stage.rom}
        </div>
      </div>

      <p className="text-[15px] text-black/50 leading-relaxed mb-8">
        {stage.desc}
      </p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium text-black/40">
            Range of Motion
          </span>
          <span className="text-[12px] font-mono text-black/35">{stage.rom}</span>
        </div>
        <div className="rom-bar">
          <div
            className="rom-bar-fill"
            style={{ width: `${pct}%`, background: stage.color }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  connected,
  error,
}: {
  connected: boolean;
  error: string | null | undefined;
}) {
  return (
    <div
      className="rounded-2xl p-8 md:p-10 text-center"
      style={{
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
      }}
    >
      <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-black/[0.03]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2v6a6 6 0 0 0 12 0V2" />
          <path d="M6 22v-6a6 6 0 0 1 12 0v6" />
        </svg>
      </div>
      <h3 className="text-[17px] font-semibold text-black/70 mb-1">
        {connected ? "No stage selected" : "Device not connected"}
      </h3>
      <p className="text-[14px] text-black/35 max-w-xs mx-auto">
        {connected
          ? "Select a rehabilitation stage from the sidebar to begin."
          : error ?? "Connect the brace to get started."}
      </p>
    </div>
  );
}

function StageRow({
  stage,
  isActive,
}: {
  stage: Stage;
  isActive: boolean;
}) {
  const pct = Math.round((stage.maxAngle / 120) * 100);

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl transition-colors"
      style={{
        background: isActive ? "rgb(var(--accent) / 0.04)" : "transparent",
      }}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: isActive ? stage.color : "rgba(0,0,0,0.1)" }}
      />
      <div className="flex-1 min-w-0">
        <span
          className="text-[14px] font-medium"
          style={{ color: isActive ? "rgb(0,122,255)" : "rgba(0,0,0,0.7)" }}
        >
          {stage.title}
        </span>
      </div>
      <div className="w-24 shrink-0">
        <div className="rom-bar">
          <div
            className="rom-bar-fill"
            style={{ width: `${pct}%`, background: stage.color, opacity: isActive ? 1 : 0.35 }}
          />
        </div>
      </div>
      <span className="text-[12px] font-mono text-black/35 w-16 text-right shrink-0">
        {stage.rom}
      </span>
    </div>
  );
}
