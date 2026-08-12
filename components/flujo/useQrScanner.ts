"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Buyer's side of the QR step (SPEC 02): asks for camera permission via
 * `getUserMedia`, draws frames onto an in-memory (never-rendered) canvas,
 * and decodes them with `jsqr` in a `requestAnimationFrame` loop. Calls
 * `onDecode` the first time it finds a QR-shaped code — it only cares that
 * *something* decoded, not whether it's a genuine, unexpired Custodio
 * token; that signature check happens server-side in `verify-qr`.
 */
export function useQrScanner(isActive: boolean, onDecode: (token: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Lets the frame loop always call the latest `onDecode` without having to
  // tear down and restart the camera/loop just because the parent handed
  // down a fresh closure — same ref pattern as `useTratoPolling`.
  const onDecodeRef = useRef(onDecode);
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    // No explicit reset needed here: `isScanning` starts `false`, and the
    // cleanup below already flips it back to `false` when `isActive` turns
    // off (or the component unmounts) — see that cleanup's `setIsScanning(false)`.
    if (!isActive) return;

    let cancelled = false;
    let hasDecoded = false;
    let stream: MediaStream | null = null;
    let animationFrameId: number | null = null;
    const canvas = document.createElement("canvas"); // never appended to the DOM — "hidden" by simply not rendering it
    const context = canvas.getContext("2d", { willReadFrequently: true });

    function tick() {
      if (cancelled || hasDecoded) return;
      const video = videoRef.current;
      if (video && context && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
        if (decoded && decoded.data) {
          hasDecoded = true;
          onDecodeRef.current(decoded.data);
          return; // stop the loop — the caller (verify-qr) decides what happens next
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setError(null);
        setIsScanning(true);
        tick();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo acceder a la cámara.");
          setIsScanning(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach((track) => track.stop());
      setIsScanning(false);
    };
  }, [isActive]);

  return { videoRef, error, isScanning };
}
