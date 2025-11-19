import { useEffect, useRef, useState } from "react";

interface SumsubKycProps {
  accessToken: string;
  refreshTokenCallback?: () => Promise<string>;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: string) => void;
}

export const SumsubKyc: React.FC<SumsubKycProps> = ({
  accessToken,
  refreshTokenCallback,
  onComplete,
  onError,
  onStatusChange,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const snsWebSdkInstanceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = useRef(`sumsub-websdk-container-${Date.now()}`);

  useEffect(() => {
    let mounted = true;

    const initializeSumsub = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!accessToken) {
          throw new Error("Missing access token");
        }

        // Load Sumsub WebSDK script (WebSDK 2.0)
        if (!window.snsWebSdk) {
          await loadSumsubScript();
        }

        if (!mounted || !containerRef.current) return;

        // Default refresh token callback if not provided
        const getNewAccessToken =
          refreshTokenCallback ||
          (async () => {
            console.warn(
              "No refresh token callback provided. Using current token."
            );
            return accessToken;
          });

        // Initialize Sumsub WebSDK 2.0 using the builder pattern
        // Reference: https://docs.sumsub.com/docs/get-started-with-web-sdk
        const snsWebSdkInstance = window.snsWebSdk
          .init(accessToken, getNewAccessToken)
          .withConf({
            lang: "en",
          })
          .withOptions({
            addViewportTag: false,
            adaptIframeHeight: true,
            enableScrollIntoView: true,
          })
          .on("idCheck.onStepCompleted", (payload: any) => {
            console.log("onStepCompleted", payload);
            onStatusChange?.(payload.stepName || payload.step);
          })
          .on("idCheck.onApplicantStatusChanged", (payload: any) => {
            console.log("onApplicantStatusChanged", payload);
            const status = payload.reviewStatus || payload.status;
            onStatusChange?.(status);

            if (status === "completed" || status === "approved") {
              onComplete?.(payload);
            }
          })
          .on("idCheck.onError", (error: any) => {
            console.error("Sumsub SDK error:", error);
            const errorMessage =
              error?.message ||
              error?.error ||
              "An error occurred during verification";
            setError(errorMessage);
            onError?.(new Error(errorMessage));
          })
          .onMessage((type: string, payload: any) => {
            console.log("onMessage", type, payload);

            // Handle different message types
            if (type === "idCheck.onStepCompleted") {
              onStatusChange?.(payload.stepName || payload.step);
            }

            if (type === "idCheck.onApplicantStatusChanged") {
              const status = payload.reviewStatus || payload.status;
              onStatusChange?.(status);

              if (status === "completed" || status === "approved") {
                onComplete?.(payload);
              }
            }
          })
          .build();

        snsWebSdkInstanceRef.current = snsWebSdkInstance;

        // Launch the SDK in the container
        // Use the container ID selector
        snsWebSdkInstance.launch(`#${containerId.current}`);

        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing Sumsub:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to initialize Sumsub";
        setError(errorMessage);
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initializeSumsub();

    return () => {
      mounted = false;
      // Note: WebSDK 2.0 doesn't have an explicit unmount method
      // The SDK will clean up when the component unmounts
      if (snsWebSdkInstanceRef.current) {
        try {
          // Try to clean up if there's a method available
          if (typeof snsWebSdkInstanceRef.current.cleanup === "function") {
            snsWebSdkInstanceRef.current.cleanup();
          }
        } catch (e) {
          console.error("Error cleaning up Sumsub SDK:", e);
        }
      }
    };
  }, [accessToken, refreshTokenCallback, onComplete, onError, onStatusChange]);

  const loadSumsubScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.snsWebSdk) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      // WebSDK 2.0 uses sns-websdk-builder.js
      script.src =
        "https://static.sumsub.com/idensic/static/sns-websdk-builder.js";
      script.async = true;
      script.onload = () => {
        // Verify the SDK is loaded
        if (window.snsWebSdk) {
          resolve();
        } else {
          reject(new Error("Sumsub WebSDK loaded but not available"));
        }
      };
      script.onerror = () =>
        reject(new Error("Failed to load Sumsub WebSDK script"));
      document.head.appendChild(script);
    });
  };

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ color: "red" }}>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 16px",
            marginTop: "10px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "600px" }}>
      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>Loading verification...</p>
        </div>
      )}
      <div
        id={containerId.current}
        ref={containerRef}
        style={{ width: "100%", minHeight: "600px" }}
      />
    </div>
  );
};

// Extend Window interface for TypeScript
// Based on Sumsub WebSDK 2.0 API: https://docs.sumsub.com/docs/get-started-with-web-sdk
declare global {
  interface Window {
    snsWebSdk: {
      init: (
        accessToken: string,
        refreshTokenCallback: () => Promise<string>
      ) => {
        withConf: (config: {
          lang?: string;
          email?: string;
          phone?: string;
          country?: string;
          i18n?: any;
          uiConf?: any;
          documentDefinitions?: any;
        }) => any;
        withOptions: (options: {
          addViewportTag?: boolean;
          adaptIframeHeight?: boolean;
          enableScrollIntoView?: boolean;
        }) => any;
        on: (event: string, handler: (payload: any) => void) => any;
        onMessage: (handler: (type: string, payload: any) => void) => any;
        build: () => {
          launch: (containerSelector: string) => void;
          cleanup?: () => void;
        };
      };
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}
