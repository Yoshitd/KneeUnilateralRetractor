// server.js — Express backend that owns the serial link to the Arduino.
//
// Responsibilities:
//   • Auto-detect a connected Arduino (override with ARDUINO_PORT env var).
//   • Keep a single SerialPort open at 9600 baud.
//   • Reconnect automatically when the board is unplugged and plugged back in.
//   • Expose a tiny REST API for the Next.js frontend to switch rehab stages.
//
// Wire protocol to the Arduino: the ASCII digit '0'..'4' followed by '\n'.
// Stages 0..3 are rehab ROM targets; stage 4 is a "return to zero" command
// that drives the brace back to its neutral/home position.

const express = require("express");
const cors = require("cors");
const { SerialPort } = require("serialport");

const HTTP_PORT = Number(process.env.PORT) || 3001;
const BAUD_RATE = 9600;
const RECONNECT_MS = 2000;

// Known USB vendor IDs for common Arduino / USB-to-serial chips.
//   2341 Arduino SA · 2a03 Arduino.org · 1a86 QinHeng CH340
//   0403 FTDI · 10c4 Silicon Labs CP210x
const ARDUINO_VENDOR_IDS = new Set(["2341", "2a03", "1a86", "0403", "10c4"]);
const MANUFACTURER_REGEX = /arduino|wch|ftdi|silicon\s*labs|ch340/i;

let port = null;
const state = {
  connected: false,
  port: null,
  stage: null,
  error: null,
};

/** Pick the best-guess Arduino port using the strategy documented in the plan. */
async function findArduinoPort() {
  if (process.env.ARDUINO_PORT) {
    return process.env.ARDUINO_PORT;
  }

  const ports = await SerialPort.list();

  // 1. Match by known vendor ID.
  const byVendor = ports.find((p) => {
    const vid = (p.vendorId || "").toLowerCase();
    return ARDUINO_VENDOR_IDS.has(vid);
  });
  if (byVendor) return byVendor.path;

  // 2. Match by manufacturer string.
  const byManufacturer = ports.find((p) =>
    MANUFACTURER_REGEX.test(p.manufacturer || "")
  );
  if (byManufacturer) return byManufacturer.path;

  // 3. Fallback: first /dev/ttyACM* or /dev/ttyUSB*.
  const byPath = ports.find((p) => /tty(ACM|USB)/.test(p.path || ""));
  if (byPath) return byPath.path;

  return null;
}

/** Attempt to open the serial port; schedules a retry on failure. */
async function connect() {
  try {
    const path = await findArduinoPort();
    if (!path) {
      state.connected = false;
      state.port = null;
      state.error = "No Arduino-compatible serial device found";
      console.warn(`[serial] ${state.error}. Retrying in ${RECONNECT_MS}ms…`);
      scheduleReconnect();
      return;
    }

    port = new SerialPort({ path, baudRate: BAUD_RATE, autoOpen: false });

    port.on("open", () => {
      state.connected = true;
      state.port = path;
      state.error = null;
      console.log(`[serial] Connected to ${path} @ ${BAUD_RATE}`);
    });

    port.on("close", () => {
      if (state.connected) {
        console.warn(`[serial] Port ${state.port} closed`);
      }
      state.connected = false;
      state.port = null;
      port = null;
      scheduleReconnect();
    });

    port.on("error", (err) => {
      state.connected = false;
      state.error = err.message;
      console.error(`[serial] Error: ${err.message}`);
    });

    port.open((err) => {
      if (err) {
        state.connected = false;
        state.port = null;
        state.error = err.message;
        port = null;
        console.error(
          `[serial] Failed to open ${path}: ${err.message}. Retrying…`
        );
        scheduleReconnect();
      }
    });
  } catch (err) {
    state.error = err.message;
    console.error(`[serial] Unexpected error during connect: ${err.message}`);
    scheduleReconnect();
  }
}

let reconnectTimer = null;
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_MS);
}

// ---------------------------------------------------------------------------
// HTTP API
// ---------------------------------------------------------------------------

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/api/status", (_req, res) => {
  res.json(state);
});

app.get("/api/ports", async (_req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json(ports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/mode", (req, res) => {
  const { stage } = req.body ?? {};
  if (!Number.isInteger(stage) || stage < 0 || stage > 4) {
    return res
      .status(400)
      .json({ error: "stage must be an integer in [0, 4]" });
  }

  if (!state.connected || !port) {
    return res.status(503).json({ error: "Arduino not connected" });
  }

  const payload = `${stage}\n`;
  const isReturnToZero = stage === 4;
  port.write(payload, (writeErr) => {
    if (writeErr) {
      console.error(`[serial] write failed: ${writeErr.message}`);
      return res.status(500).json({ error: writeErr.message });
    }
    port.drain((drainErr) => {
      if (drainErr) {
        console.error(`[serial] drain failed: ${drainErr.message}`);
        return res.status(500).json({ error: drainErr.message });
      }
      // Return-to-zero is a transient command; don't leave it as the "active"
      // rehab stage in reported state — clear instead.
      state.stage = isReturnToZero ? null : stage;
      console.log(
        isReturnToZero
          ? "[serial] → sent return-to-zero command"
          : `[serial] → sent stage ${stage}`
      );
      res.json({ ok: true, stage });
    });
  });
});

app.listen(HTTP_PORT, () => {
  console.log(`[http]   Listening on http://localhost:${HTTP_PORT}`);
  connect();
});

// Clean shutdown so the USB device isn't left in a weird state.
function shutdown() {
  console.log("\n[server] Shutting down…");
  if (port && port.isOpen) {
    port.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
