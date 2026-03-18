'use client';

import { Camera, CameraOff, LoaderCircle, ScanLine, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const BARCODE_FORMATS: BarcodeFormat[] = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'itf',
  'codabar',
];

type CameraScannerPanelProps = {
  onDetected: (value: string) => void;
  pauseAfterDetect?: boolean;
  collapsible?: boolean;
  launcherLabel?: string;
  launcherDescription?: string;
};

export default function CameraScannerPanel({
  onDetected,
  pauseAfterDetect = false,
  collapsible = false,
  launcherLabel = 'Open Camera Scanner',
  launcherDescription = 'Use your device camera only when you need live barcode scanning.',
}: CameraScannerPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const lastDetectedRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });

  const [isSupported, setIsSupported] = useState(false);
  const [isCheckingSupport, setIsCheckingSupport] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [lastDetected, setLastDetected] = useState('');
  const [statusMessage, setStatusMessage] = useState('Start the camera to scan a barcode live.');
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const clearScheduledScan = () => {
    if (scanTimeoutRef.current !== null) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const stopStreamTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopScanner = (status?: string) => {
    isRunningRef.current = false;
    clearScheduledScan();
    stopStreamTracks();

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (!isMountedRef.current) {
      return;
    }

    setIsStarting(false);
    setIsRunning(false);
    if (status) {
      setStatusMessage(status);
    }
  };

  const collapsePanel = () => {
    stopScanner('Camera is off.');
    setIsExpanded(false);
  };

  const scheduleNextScan = () => {
    clearScheduledScan();
    scanTimeoutRef.current = window.setTimeout(() => {
      void detectBarcode();
    }, 250);
  };

  const detectBarcode = async () => {
    if (!isRunningRef.current) {
      return;
    }

    const video = videoRef.current;
    const detector = detectorRef.current;

    if (!video || !detector || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      scheduleNextScan();
      return;
    }

    try {
      const barcodes = await detector.detect(video);
      const matchedBarcode = barcodes.find((barcode) => typeof barcode.rawValue === 'string' && barcode.rawValue.trim());

      if (matchedBarcode?.rawValue) {
        const detectedValue = matchedBarcode.rawValue.trim();
        const now = Date.now();
        const isDuplicate =
          lastDetectedRef.current.value === detectedValue &&
          now - lastDetectedRef.current.at < 1500;

        if (!isDuplicate) {
          lastDetectedRef.current = { value: detectedValue, at: now };

          if (isMountedRef.current) {
            setLastDetected(detectedValue);
            setStatusMessage(`Detected ${detectedValue}.`);
          }

          onDetectedRef.current(detectedValue);

          if (pauseAfterDetect) {
            stopScanner(`Detected ${detectedValue}. Camera paused.`);
            return;
          }
        }
      }
    } catch {
      if (isMountedRef.current) {
        setCameraError('Live barcode detection failed on this frame. You can keep using manual or hardware scanner input.');
      }
    }

    scheduleNextScan();
  };

  const startScanner = async () => {
    if (!isSupported || isStarting || isRunningRef.current) {
      return;
    }

    setCameraError('');
    setIsStarting(true);
    setStatusMessage('Requesting camera access...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const video = videoRef.current;
      if (!video) {
        stopStreamTracks();
        throw new Error('Camera preview element is not available.');
      }

      streamRef.current = stream;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();

      detectorRef.current = new BarcodeDetector({ formats: BARCODE_FORMATS });
      isRunningRef.current = true;
      setIsStarting(false);
      setIsRunning(true);
      setStatusMessage('Point the camera at a barcode. Detection runs automatically.');
      void detectBarcode();
    } catch (error) {
      stopStreamTracks();
      isRunningRef.current = false;
      setIsStarting(false);
      setIsRunning(false);

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setCameraError('Camera access was blocked. Allow permission in the browser and try again.');
      } else if (error instanceof DOMException && error.name === 'NotFoundError') {
        setCameraError('No camera was found on this device. Manual and hardware scanner input still work.');
      } else {
        setCameraError('Unable to start camera scanning on this device.');
      }

      setStatusMessage('Camera is off.');
    }
  };

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'mediaDevices' in navigator &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof BarcodeDetector !== 'undefined';

    setIsSupported(supported);
    setIsCheckingSupport(false);

    if (!supported) {
      setStatusMessage('Camera scanning is unavailable in this browser. Use manual or hardware scanner input.');
    }
  }, []);

  useEffect(() => {
    if (!collapsible) {
      setIsExpanded(true);
    }
  }, [collapsible]);

  useEffect(() => {
    const currentVideo = videoRef.current;

    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
      clearScheduledScan();
      stopStreamTracks();

      if (currentVideo) {
        currentVideo.pause();
        currentVideo.srcObject = null;
      }
    };
  }, []);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/70"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
          <ScanLine size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800">{launcherLabel}</span>
          <span className="mt-1 block text-xs text-slate-500">{launcherDescription}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
      {collapsible && (
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Live Camera Scan</p>
            <p className="text-xs text-slate-500">Open only when you want to scan with the device camera.</p>
          </div>
          <button
            type="button"
            onClick={collapsePanel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close camera scanner"
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="relative aspect-[16/10] bg-slate-950">
        <video ref={videoRef} className="h-full w-full object-cover" />
        {!isRunning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-slate-200">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <ScanLine size={30} />
            </div>
            <div>
              <p className="text-sm font-semibold">Live Camera Scan</p>
              <p className="mt-1 text-xs text-slate-300">
                Use your device camera to read barcodes without typing.
              </p>
            </div>
          </div>
        )}
        {isRunning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="h-28 w-full max-w-xs rounded-2xl border-2 border-emerald-300/90 shadow-[0_0_0_999px_rgba(15,23,42,0.25)]" />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Camera Scanner</p>
            <p className="mt-1 text-xs text-slate-500">{statusMessage}</p>
            {lastDetected && (
              <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Last scan: {lastDetected}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={isRunning ? () => stopScanner('Camera stopped.') : startScanner}
            disabled={isCheckingSupport || isStarting || !isSupported}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isStarting ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Starting...
              </>
            ) : isRunning ? (
              <>
                <CameraOff size={16} />
                Stop Camera
              </>
            ) : (
              <>
                <Camera size={16} />
                Open Camera
              </>
            )}
          </button>
        </div>

        {cameraError && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {cameraError}
          </div>
        )}
      </div>
    </div>
  );
}
