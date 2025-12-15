"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

// Component that handles export functionality
export function CanvasExporter() {
  const { gl, size, scene, camera } = useThree();
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const videoFormatRef = useRef({ extension: "mp4", mimeType: "video/mp4" });
  const streamRef = useRef(null);
  const dataRequestIntervalRef = useRef(null);

  useEffect(() => {
    const handleExportImage = async () => {
      try {
        // Force a render to ensure the canvas is up to date
        gl.render(scene, camera);

        // Wait a frame to ensure render is complete
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Get the canvas element
        const canvas = gl.domElement;

        // Verify canvas has content
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          console.error("Canvas is empty or not initialized", {
            width: canvas?.width,
            height: canvas?.height,
          });
          return;
        }

        // Create a high-quality blob
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `canvas-export-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            } else {
              console.error("Failed to create image blob or blob is empty", {
                blobSize: blob?.size,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
              });
            }
          },
          "image/png",
          1.0 // Maximum quality
        );
      } catch (error) {
        console.error("Error exporting image:", error);
      }
    };

    const handleExportVideo = async () => {
      // If already recording, stop the recording
      if (isRecordingRef.current) {
        try {
          // Clear the data request interval
          if (dataRequestIntervalRef.current) {
            clearInterval(dataRequestIntervalRef.current);
            dataRequestIntervalRef.current = null;
          }

          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
          ) {
            // Request final data before stopping
            if (mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.requestData();
            }
            mediaRecorderRef.current.stop();
          }
          // Stop all tracks to release resources
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        } catch (error) {
          console.error("Error stopping recording:", error);
        }
        return;
      }

      try {
        const canvas = gl.domElement;

        // Verify canvas has content
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          console.error("Canvas is empty or not initialized");
          return;
        }

        // Get the stream from the canvas
        const stream = canvas.captureStream(60); // 60 fps for smooth video
        streamRef.current = stream; // Store stream reference for cleanup

        // Verify stream has tracks
        if (!stream || stream.getVideoTracks().length === 0) {
          console.error("Failed to capture stream from canvas");
          return;
        }

        // Create MediaRecorder with high quality settings
        // Try MP4 (H.264) variations first, then fallback to WebM codecs
        const mp4Options = [
          { mimeType: "video/mp4;codecs=h264", videoBitsPerSecond: 25000000 },
          { mimeType: "video/mp4", videoBitsPerSecond: 25000000 },
          {
            mimeType: "video/x-matroska;codecs=h264",
            videoBitsPerSecond: 25000000,
          }, // MKV with H.264
        ];

        const webmVP9Options = {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: 25000000,
        };

        const webmVP8Options = {
          mimeType: "video/webm;codecs=vp8",
          videoBitsPerSecond: 25000000,
        };

        let mediaRecorder;
        let fileExtension = "mp4";
        let mimeType = "video/mp4";

        // Try MP4 (H.264) variations first
        let mp4Supported = false;
        for (const option of mp4Options) {
          if (MediaRecorder.isTypeSupported(option.mimeType)) {
            mediaRecorder = new MediaRecorder(stream, option);
            mimeType = option.mimeType;
            mp4Supported = true;
            // Use .mp4 extension for MKV too since it contains H.264
            fileExtension = option.mimeType.includes("matroska")
              ? "mp4"
              : "mp4";
            break;
          }
        }

        if (!mp4Supported) {
          // Fallback to WebM codecs
          if (MediaRecorder.isTypeSupported(webmVP9Options.mimeType)) {
            mediaRecorder = new MediaRecorder(stream, webmVP9Options);
            mimeType = webmVP9Options.mimeType;
            fileExtension = "webm";
          } else if (MediaRecorder.isTypeSupported(webmVP8Options.mimeType)) {
            mediaRecorder = new MediaRecorder(stream, webmVP8Options);
            mimeType = webmVP8Options.mimeType;
            fileExtension = "webm";
          } else {
            // Last resort - browser default
            mediaRecorder = new MediaRecorder(stream);
            // Try to detect the mime type
            if (
              mediaRecorder.mimeType &&
              mediaRecorder.mimeType.includes("mp4")
            ) {
              fileExtension = "mp4";
              mimeType = mediaRecorder.mimeType;
            } else {
              fileExtension = "webm";
              mimeType = mediaRecorder.mimeType || "video/webm";
            }
          }
        }

        recordedChunksRef.current = [];
        mediaRecorderRef.current = mediaRecorder;
        isRecordingRef.current = true;

        // Store file extension and mime type for later use in callback
        videoFormatRef.current = {
          extension: fileExtension,
          mimeType: mimeType,
        };

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
            console.log(
              `Received data chunk: ${event.data.size} bytes, total chunks: ${recordedChunksRef.current.length}`
            );
          }
        };

        mediaRecorder.onstop = () => {
          // Clear the data request interval
          if (dataRequestIntervalRef.current) {
            clearInterval(dataRequestIntervalRef.current);
            dataRequestIntervalRef.current = null;
          }

          // Stop all tracks to release resources
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }

          if (recordedChunksRef.current.length === 0) {
            console.error("No video data was recorded");
            isRecordingRef.current = false;
            window.dispatchEvent(
              new CustomEvent("recordingStateChange", {
                detail: { isRecording: false },
              })
            );
            return;
          }

          console.log(
            `Recording stopped. Total chunks: ${
              recordedChunksRef.current.length
            }, total size: ${recordedChunksRef.current.reduce(
              (sum, chunk) => sum + chunk.size,
              0
            )} bytes`
          );

          const blob = new Blob(recordedChunksRef.current, {
            type: videoFormatRef.current.mimeType,
          });

          console.log(
            `Final blob size: ${blob.size} bytes, type: ${videoFormatRef.current.mimeType}`
          );

          if (blob.size === 0) {
            console.error("Recorded blob is empty");
            isRecordingRef.current = false;
            window.dispatchEvent(
              new CustomEvent("recordingStateChange", {
                detail: { isRecording: false },
              })
            );
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `canvas-video-${Date.now()}.${
            videoFormatRef.current.extension
          }`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          isRecordingRef.current = false;
          recordedChunksRef.current = [];
          // Notify that recording stopped
          window.dispatchEvent(
            new CustomEvent("recordingStateChange", {
              detail: { isRecording: false },
            })
          );
        };

        mediaRecorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          isRecordingRef.current = false;
          window.dispatchEvent(
            new CustomEvent("recordingStateChange", {
              detail: { isRecording: false },
            })
          );
        };

        // Notify that recording started
        window.dispatchEvent(
          new CustomEvent("recordingStateChange", {
            detail: { isRecording: true },
          })
        );

        // Start recording - use timeslice of 1000ms (1 second) to ensure regular data chunks
        // Some browsers need a timeslice to work properly
        mediaRecorder.start(1000);

        // Also periodically request data to ensure we capture everything
        // This helps with browsers that might not emit data automatically
        dataRequestIntervalRef.current = setInterval(() => {
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
          ) {
            try {
              mediaRecorderRef.current.requestData();
            } catch (error) {
              // Ignore errors if recorder is stopping
              console.warn("Could not request data:", error);
            }
          }
        }, 500); // Request data every 500ms
      } catch (error) {
        console.error("Error exporting video:", error);
        isRecordingRef.current = false;
        // Notify that recording failed/stopped
        window.dispatchEvent(
          new CustomEvent("recordingStateChange", {
            detail: { isRecording: false },
          })
        );
      }
    };

    // Listen for export events
    const handleImageExport = () => handleExportImage();
    const handleVideoExport = () => handleExportVideo();

    window.addEventListener("exportCanvasImage", handleImageExport);
    window.addEventListener("exportCanvasVideo", handleVideoExport);

    return () => {
      window.removeEventListener("exportCanvasImage", handleImageExport);
      window.removeEventListener("exportCanvasVideo", handleVideoExport);

      // Cleanup recording if component unmounts
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current);
        dataRequestIntervalRef.current = null;
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [gl, scene, camera]);

  return null;
}
