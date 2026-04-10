"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStatus, setMode, type Status } from "../lib/api";

type Stage = {
  id: number;
  title: string;
  rom: string;
  desc: string;
  accent: string; // DaisyUI color class for the progress bar
};

const STAGES: Stage[] = [
  {
    id: 0,
    title: "Immobilization",
    rom: "0° – 30°",
    desc: "Protect the repair and strictly limit flexion.",
    accent: "progress-error",
  },
  {
    id: 1,
    title: "Early Motion",
    rom: "0° – 60°",
    desc: "Begin gradual, controlled flexion.",
    accent: "progress-warning",
  },
  {
    id: 2,
    title: "Mid-phase Recovery",
    rom: "0° – 90°",
    desc: "Increase tolerance and range.",
    accent: "progress-info",
  },
  {
    id: 3,
    title: "Full Range of Motion",
    rom: "0° – 120°+",
    desc: "Work toward patient-specific targets.",
    accent: "progress-success",
  },
];

type Toast = { kind: "success" | "error"; message: string; id: number };

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
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
        error: "Cannot reach server.js on :3001",
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
    }, 3500);
  };

  const handleSelect = async (stage: number) => {
    if (!status?.connected || pendingStage !== null) return;
    setPendingStage(stage);
    try {
      await setMode(stage);
      pushToast("success", `Stage ${stage} sent to Arduino`);
      await refreshStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      pushToast("error", `Failed to set stage: ${message}`);
    } finally {
      setPendingStage(null);
    }
  };

  const connected = !!status?.connected;
  const activeStage = status?.stage ?? null;

  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <div className="navbar bg-base-200/60 backdrop-blur border-b border-base-300 px-6">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary grid place-items-center shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-primary-content"
              >
                <path d="M6 2v6a6 6 0 0 0 12 0V2" />
                <path d="M6 22v-6a6 6 0 0 1 12 0v6" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Knee Rehab Controller
              </h1>
              <p className="text-xs opacity-70 leading-tight">
                Unilateral Retractor · Clinician Panel
              </p>
            </div>
          </div>
        </div>
        <div className="flex-none">
          <StatusPill status={status} />
        </div>
      </div>

      {/* Hero */}
      <section className="hero-glow">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <div className="badge badge-outline badge-lg mb-5 gap-2">
            <span className="w-2 h-2 rounded-full bg-primary status-dot" />
            Phase-based rehabilitation
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Guide recovery,
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              one safe stage at a time.
            </span>
          </h2>
          <p className="mt-5 max-w-2xl text-base md:text-lg opacity-75">
            Select a rehabilitation stage to update the brace&apos;s range of
            motion limits. Changes are sent to the Arduino over serial the
            moment you click.
          </p>
        </div>
      </section>

      {/* Stage cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h3 className="text-xl font-bold">Rehabilitation Stages</h3>
          <span className="text-sm opacity-60">
            {activeStage !== null
              ? `Currently active: Stage ${activeStage}`
              : "No stage sent yet"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {STAGES.map((stage) => {
            const isActive = activeStage === stage.id;
            const isPending = pendingStage === stage.id;
            return (
              <article
                key={stage.id}
                className={`card bg-base-200 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${
                  isActive
                    ? "ring-2 ring-success ring-offset-2 ring-offset-base-100"
                    : ""
                }`}
              >
                <div className="card-body gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-5xl font-black opacity-20 leading-none select-none">
                        {stage.id}
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest opacity-60">
                          Stage {stage.id}
                        </p>
                        <h4 className="card-title text-lg leading-tight">
                          {stage.title}
                        </h4>
                      </div>
                    </div>
                    {isActive && (
                      <span className="badge badge-success badge-sm gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-content" />
                        Active
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-semibold">Range of Motion</span>
                      <span className="font-mono opacity-80">{stage.rom}</span>
                    </div>
                    <progress
                      className={`progress ${stage.accent} w-full`}
                      value={(stage.id + 1) * 25}
                      max={100}
                    />
                  </div>

                  <p className="text-sm opacity-75 leading-relaxed">
                    {stage.desc}
                  </p>

                  <div className="card-actions mt-1">
                    <button
                      className={`btn w-full ${
                        isActive ? "btn-success" : "btn-primary"
                      }`}
                      disabled={!connected || pendingStage !== null}
                      onClick={() => handleSelect(stage.id)}
                    >
                      {isPending ? (
                        <>
                          <span className="loading loading-spinner loading-sm" />
                          Sending…
                        </>
                      ) : isActive ? (
                        "Currently Active"
                      ) : (
                        "Select Stage"
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Disconnected notice */}
        {!connected && (
          <div className="alert alert-warning mt-8 shadow">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4 className="font-bold">Arduino not connected</h4>
              <p className="text-sm opacity-80">
                {status?.error ??
                  "Plug in the rehab brace and the stage selection will become available."}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 pb-10 text-xs opacity-50">
        Always validate stage transitions against the treating clinician&apos;s
        prescription before use.
      </footer>

      {/* Toasts */}
      <div className="toast toast-end z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`alert ${
              t.kind === "success" ? "alert-success" : "alert-error"
            } shadow-lg`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: Status | null }) {
  if (!status) {
    return (
      <span className="badge badge-ghost gap-2">
        <span className="w-2 h-2 rounded-full bg-base-content/40" />
        Loading…
      </span>
    );
  }
  if (status.connected) {
    return (
      <span className="badge badge-success gap-2 py-3">
        <span className="w-2 h-2 rounded-full bg-success-content status-dot" />
        <span className="font-semibold">Connected</span>
        <span className="opacity-80 font-mono text-xs">{status.port}</span>
      </span>
    );
  }
  return (
    <span className="badge badge-error gap-2 py-3">
      <span className="w-2 h-2 rounded-full bg-error-content" />
      <span className="font-semibold">Disconnected</span>
    </span>
  );
}
