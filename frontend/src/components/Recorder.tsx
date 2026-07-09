"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

type RecorderState = "idle" | "recording" | "recorded" | "error";

interface RecorderProps {
  onSubmit: (blob: Blob) => Promise<void>;
  disabled?: boolean;
  timerEnabled?: boolean;
  timerSeconds?: number;
}

export function Recorder({ onSubmit, disabled, timerEnabled = false, timerSeconds = 90 }: RecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
  }

  function drawWaveform(analyser: AnalyserNode) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#22d3ee";
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      rafRef.current = requestAnimationFrame(render);
    };
    render();
  }

  async function startRecording() {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      drawWaveform(analyser);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        blobRef.current = new Blob(chunksRef.current, { type: "audio/webm" });
        setState("recorded");
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 1;
          if (timerEnabled && next >= timerSeconds) {
            mediaRecorderRef.current?.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      setErrorMessage("Microphone access was denied or is unavailable.");
      setState("error");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function reRecord() {
    blobRef.current = null;
    setState("idle");
    setElapsed(0);
  }

  async function submit() {
    if (!blobRef.current) return;
    setSubmitting(true);
    try {
      await onSubmit(blobRef.current);
    } finally {
      setSubmitting(false);
    }
  }

  const displaySeconds = timerEnabled ? Math.max(timerSeconds - elapsed, 0) : elapsed;
  const mm = String(Math.floor(displaySeconds / 60)).padStart(2, "0");
  const ss = String(displaySeconds % 60).padStart(2, "0");
  const timeLow = timerEnabled && displaySeconds <= 10;

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={480}
        height={80}
        className="w-full max-w-md rounded-lg bg-black/30"
      />

      {state === "recording" && (
        <span className={`font-mono text-sm ${timeLow ? "text-red-400" : "text-foreground/70"}`}>
          {timerEnabled ? "Time left: " : ""}
          {mm}:{ss}
        </span>
      )}

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

      <div className="flex gap-3">
        {state === "idle" && (
          <Button onClick={startRecording} disabled={disabled}>
            <Mic size={16} /> Record Answer
          </Button>
        )}
        {state === "recording" && (
          <Button variant="danger" onClick={stopRecording}>
            <Square size={16} /> Stop
          </Button>
        )}
        {state === "recorded" && (
          <>
            <Button variant="secondary" onClick={reRecord} disabled={submitting}>
              <RotateCcw size={16} /> Re-record
            </Button>
            <Button onClick={submit} disabled={submitting}>
              <Send size={16} /> {submitting ? "Analyzing..." : "Submit Answer"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
