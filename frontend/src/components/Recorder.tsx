"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

type RecorderState = "idle" | "recording" | "recorded" | "error";

interface RecorderProps {
  onSubmit: (blob: Blob) => Promise<void>;
  disabled?: boolean;
  timerEnabled?: boolean;
  timerSeconds?: number;
}

const LIVE_FILLER_WORDS = new Set(["um", "umm", "uh", "uhh", "like", "actually", "basically", "literally"]);

export function Recorder({ onSubmit, disabled, timerEnabled = false, timerSeconds = 90 }: RecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveFillers, setLiveFillers] = useState(0);
  const [liveSupported, setLiveSupported] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveTextRef = useRef<string>("");
  const elapsedRef = useRef(0);

  useEffect(() => {
    const SpeechRecognitionCtor =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setLiveSupported(!!SpeechRecognitionCtor);
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
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

  function startLiveCoaching() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    liveTextRef.current = "";
    setLiveWpm(0);
    setLiveFillers(0);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript + " ";
      }
      liveTextRef.current = combined;

      const words = combined.trim().split(/\s+/).filter(Boolean);
      const minutes = Math.max(elapsedRef.current / 60, 1 / 60);
      setLiveWpm(Math.round(words.length / minutes));
      setLiveFillers(words.filter((w) => LIVE_FILLER_WORDS.has(w.toLowerCase().replace(/[^a-z']/g, ""))).length);
    };
    recognition.onerror = () => {
      // Live coaching is a bonus feature -- fail silently, recording itself is unaffected.
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // ignore -- some browsers throw if called twice in quick succession
    }
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
        try {
          recognitionRef.current?.stop();
        } catch {
          // ignore
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setState("recording");
      setElapsed(0);
      startLiveCoaching();
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
  const paceHot = liveWpm > 170;

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={480}
        height={80}
        className="w-full max-w-md rounded-lg bg-black/30"
      />

      {state === "recording" && (
        <div className="flex flex-col items-center gap-2">
          <span className={`font-mono text-base ${timeLow ? "text-red-400" : "text-foreground/70"}`}>
            {timerEnabled ? "Time left: " : ""}
            {mm}:{ss}
          </span>
          {liveSupported && elapsed > 2 && (
            <div className="flex items-center gap-3 rounded-full border border-panel-border bg-black/20 px-4 py-1.5 text-xs">
              <span className={`flex items-center gap-1 ${paceHot ? "text-red-400" : "text-foreground/60"}`}>
                <Zap size={12} /> {liveWpm} wpm
              </span>
              <span className="text-foreground/30">|</span>
              <span className={liveFillers >= 3 ? "text-red-400" : "text-foreground/60"}>
                {liveFillers} filler{liveFillers === 1 ? "" : "s"}
              </span>
            </div>
          )}
        </div>
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
