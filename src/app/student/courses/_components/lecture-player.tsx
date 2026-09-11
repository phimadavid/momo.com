"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  BackTenIcon,
  BookmarkIcon,
  CaptionsIcon,
  DownloadIcon,
  ExpandIcon,
  ForwardTenIcon,
  NotePenIcon,
  PauseIcon,
  PlayFillIcon,
  VolumeIcon,
  VolumeOffIcon,
} from "~/app/_components/icons";
import { mmss } from "~/app/student/_components/format";
import { addLessonNote, saveLessonProgress } from "../actions";

type Marker = { id: string; label: string; positionSeconds: number };
type Note = { id: string; body: string; timestampSeconds: number | null };

/** "none": no video posted; "unsupported": HLS outside Safari. */
type Status = "none" | "loading" | "ready" | "unsupported" | "failed";

const STATUS_MESSAGES: Partial<Record<Status, string>> = {
  none: "No lecture video has been posted for this lesson.",
  unsupported: "This browser can't play the lecture stream. Try Safari.",
  failed: "The lecture video couldn't be loaded.",
};

/** Playback speeds the speed button cycles through. */
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
const AUTOSAVE_MS = 15_000;

export function LecturePlayer({
  lessonId,
  heading,
  badge,
  videoUrl,
  transcriptUrl,
  durationSeconds,
  startAt,
  markers,
  notes,
  viewers,
}: {
  lessonId: string;
  heading: string;
  badge: string;
  videoUrl: string | null;
  transcriptUrl: string | null;
  durationSeconds: number | null;
  startAt: number;
  markers: Marker[];
  notes: Note[];
  viewers: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastSaved = useRef(startAt);

  const [status, setStatus] = useState<Status>(videoUrl ? "loading" : "none");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(startAt);
  const [duration, setDuration] = useState(durationSeconds ?? 0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [noteAt, setNoteAt] = useState<number | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, startSavingNote] = useTransition();
  const ready = status === "ready";

  // HLS only plays natively in Safari; elsewhere say so rather than show a
  // player that never starts.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    const isHls = /\.m3u8(\?|$)/i.test(videoUrl);
    if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
      setStatus("unsupported");
      return;
    }
    video.src = videoUrl;
  }, [videoUrl]);

  const persist = useCallback(
    (seconds: number) => {
      const whole = Math.floor(seconds);
      if (whole === lastSaved.current) return;
      lastSaved.current = whole;
      void saveLessonProgress(lessonId, whole);
    },
    [lessonId],
  );

  // Autosave while playing…
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (videoRef.current) persist(videoRef.current.currentTime);
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [playing, persist]);

  // …and once more if the student navigates away mid-lecture.
  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video && !video.paused) persist(video.currentTime);
    };
  }, [persist]);

  // A media duration is NaN until known and 0 for an empty source.
  const knownDuration = (value: number) =>
    Number.isFinite(value) && value > 0 ? value : null;
  const total = knownDuration(duration) ?? durationSeconds ?? 0;
  const percent = total > 0 ? Math.min(100, (position / total) * 100) : 0;

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const next = Math.min(Math.max(seconds, 0), total);
    video.currentTime = next;
    setPosition(next);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const cycleRate = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length]!;
    if (videoRef.current) videoRef.current.playbackRate = next;
    setRate(next);
  };

  const changeVolume = (value: number) => {
    const video = videoRef.current;
    if (video) {
      video.volume = value;
      video.muted = value === 0;
    }
    setVolume(value);
    setMuted(value === 0);
  };

  const toggleMute = () => {
    const next = !muted;
    if (videoRef.current) videoRef.current.muted = next;
    setMuted(next);
  };

  const toggleCaptions = () => {
    const next = !captions;
    const track = videoRef.current?.textTracks[0];
    if (track) track.mode = next ? "showing" : "hidden";
    setCaptions(next);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen();
  };

  const startNote = () => {
    videoRef.current?.pause();
    setNoteError(null);
    setNoteAt(Math.floor(position));
  };

  const saveNote = () => {
    const body = noteBody.trim();
    if (!body) return;
    startSavingNote(async () => {
      try {
        await addLessonNote(lessonId, body, noteAt);
        setNoteBody("");
        setNoteAt(null);
      } catch {
        setNoteError("Your note could not be saved. Please try again.");
      }
    });
  };

  const message = STATUS_MESSAGES[status];

  return (
    <section className="border-line bg-surface shadow-card overflow-hidden rounded-2xl border">
      <div
        ref={stageRef}
        className="bg-navy-deep relative aspect-video min-h-72 w-full overflow-hidden"
      >
        <video
          ref={videoRef}
          preload="metadata"
          playsInline
          className={`absolute inset-0 size-full object-contain ${ready ? "" : "invisible"}`}
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setDuration(knownDuration(video.duration) ?? durationSeconds ?? 0);
            if (startAt > 0 && startAt < video.duration - 1) {
              video.currentTime = startAt;
            }
            video.playbackRate = rate;
            video.volume = volume;
            setStatus("ready");
          }}
          onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={(event) => {
            setPlaying(false);
            persist(event.currentTarget.currentTime);
          }}
          onEnded={(event) => persist(event.currentTarget.duration)}
          onError={() => setStatus("failed")}
          onClick={togglePlay}
        >
          {/* Only once the video plays, so a dead stream fetches nothing. */}
          {ready && transcriptUrl && (
            <track
              kind="captions"
              src={transcriptUrl}
              srcLang="en"
              label="English"
            />
          )}
        </video>

        {!ready && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgb(37_99_235/0.35),transparent_55%),radial-gradient(circle_at_80%_80%,rgb(249_115_22/0.18),transparent_50%)]"
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/60 to-transparent p-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
            <span className="size-2 rounded-full bg-rose-500" />
            {badge}
          </span>
          <p className="mt-2 hidden text-sm font-semibold text-white/90 sm:block sm:text-base">
            {heading}
          </p>
        </div>

        {!playing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!ready}
              aria-label="Play lecture"
              className="bg-brand flex size-16 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              <PlayFillIcon className="ml-1 size-7" />
            </button>
            {message && (
              <p className="rounded-lg bg-black/55 px-3 py-1.5 text-center text-xs text-white/85">
                {message}
              </p>
            )}
            {status === "loading" && (
              <p className="text-xs text-white/70">Loading lecture…</p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-4 pt-10 pb-3">
          <div className="relative h-4">
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/25">
              <div
                className="bg-brand h-full rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
            {total > 0 &&
              markers.map((marker) => (
                <span
                  key={marker.id}
                  aria-hidden="true"
                  className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-amber-300"
                  style={{ left: `${(marker.positionSeconds / total) * 100}%` }}
                />
              ))}
            <span
              aria-hidden="true"
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: `${percent}%` }}
            />
            <input
              type="range"
              min={0}
              max={Math.max(Math.floor(total), 1)}
              step={1}
              value={Math.floor(position)}
              disabled={!ready}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Seek"
              aria-valuetext={`${mmss(Math.floor(position))} of ${mmss(Math.floor(total))}`}
              className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-white">
            <ControlButton
              label={playing ? "Pause" : "Play"}
              onClick={togglePlay}
              disabled={!ready}
            >
              {playing ? (
                <PauseIcon className="size-5" />
              ) : (
                <PlayFillIcon className="size-5" />
              )}
            </ControlButton>
            <ControlButton
              label="Back 10 seconds"
              onClick={() => seek(position - 10)}
              disabled={!ready}
            >
              <BackTenIcon className="size-5" />
            </ControlButton>
            <ControlButton
              label="Forward 10 seconds"
              onClick={() => seek(position + 10)}
              disabled={!ready}
            >
              <ForwardTenIcon className="size-5" />
            </ControlButton>
            <div className="hidden items-center gap-2 sm:flex">
              <ControlButton
                label={muted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                disabled={!ready}
              >
                {muted ? (
                  <VolumeOffIcon className="size-5" />
                ) : (
                  <VolumeIcon className="size-5" />
                )}
              </ControlButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(event) => changeVolume(Number(event.target.value))}
                disabled={!ready}
                aria-label="Volume"
                className="h-1 w-20 accent-white"
              />
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums">
              {mmss(Math.floor(position))} / {mmss(Math.floor(total))}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={cycleRate}
                disabled={!ready}
                aria-label={`Playback speed ${rate}x`}
                className="rounded-md bg-white/15 px-2 py-1 text-xs font-bold transition hover:bg-white/25 disabled:opacity-50"
              >
                {rate}x
              </button>
              {transcriptUrl && (
                <button
                  type="button"
                  onClick={toggleCaptions}
                  disabled={!ready}
                  aria-pressed={captions}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2 py-1 text-xs font-bold transition hover:bg-white/25 disabled:opacity-50"
                >
                  <CaptionsIcon className="size-4" />
                  CC {captions ? "On" : "Off"}
                </button>
              )}
              <button
                type="button"
                onClick={startNote}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-bold transition hover:bg-white/25"
              >
                <NotePenIcon className="size-4" />
                <span className="hidden sm:inline">Take Timestamped Note</span>
                <span className="sm:hidden">Note</span>
              </button>
              <ControlButton label="Fullscreen" onClick={toggleFullscreen}>
                <ExpandIcon className="size-5" />
              </ControlButton>
            </div>
          </div>
        </div>
      </div>

      {/* Markers, audience, transcript */}
      <div className="bg-canvas/60 space-y-2 px-5 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={() => seek(marker.positionSeconds)}
              disabled={!ready}
              className="text-navy inline-flex items-center gap-1.5 font-semibold enabled:hover:underline"
            >
              <BookmarkIcon className="size-3.5" />
              Key Marker: {marker.label} ({mmss(marker.positionSeconds)})
            </button>
          ))}
          {viewers > 0 && (
            <span className="text-muted">
              • {viewers} student{viewers === 1 ? "" : "s"} watching right now
            </span>
          )}
        </div>
        {transcriptUrl && (
          <a
            href={transcriptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand inline-flex items-center gap-1.5 font-semibold hover:underline"
          >
            <DownloadIcon className="size-3.5" />
            Download Transcript (.VTT)
          </a>
        )}
      </div>

      {/* Timestamped notes */}
      {(noteAt !== null || notes.length > 0) && (
        <div className="border-line border-t px-5 py-4">
          {noteAt !== null && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveNote();
              }}
              className="mb-4"
            >
              <label
                htmlFor={`note-${lessonId}`}
                className="text-ink text-xs font-bold"
              >
                Note at {mmss(noteAt)}
              </label>
              <textarea
                id={`note-${lessonId}`}
                rows={3}
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                maxLength={5000}
                placeholder="What stood out at this point in the lecture?"
                className="border-line bg-canvas text-ink placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-brand/10 mt-2 w-full resize-y rounded-xl border px-3 py-2 text-sm transition outline-none focus:ring-4"
              />
              {noteError && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {noteError}
                </p>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNoteAt(null)}
                  className="border-line text-ink hover:bg-canvas rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote || noteBody.trim().length === 0}
                  className="bg-navy hover:bg-navy-deep rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingNote ? "Saving…" : "Save Note"}
                </button>
              </div>
            </form>
          )}

          {notes.length > 0 && (
            <>
              <p className="text-muted text-[11px] font-bold tracking-wide uppercase">
                My Notes ({notes.length})
              </p>
              <ul className="mt-2 space-y-2">
                {notes.map((note) => (
                  <li key={note.id} className="flex gap-3 text-sm">
                    {note.timestampSeconds !== null && (
                      <button
                        type="button"
                        onClick={() => seek(note.timestampSeconds ?? 0)}
                        disabled={!ready}
                        className="bg-brand-soft text-brand h-fit shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold"
                      >
                        {mmss(note.timestampSeconds)}
                      </button>
                    )}
                    <p className="text-ink min-w-0 whitespace-pre-line">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function ControlButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-md p-1 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}
