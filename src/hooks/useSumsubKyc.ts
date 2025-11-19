import { useState, useCallback } from "react";
import { kycService } from "../services/kyc.service";

interface UseSumsubKycOptions {
  userId: string;
  levelName?: string;
  externalActionId?: string;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export const useSumsubKyc = (options: UseSumsubKycOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkInstance, setSdkInstance] = useState<any>(null);

  const launchKyc = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load Sumsub WebSDK script if not already loaded
      if (!window.SNSWebSDK) {
        await loadSumsubScript();
      }

      // Get access token from backend
      const tokenResponse = await kycService.generateSumsubAccessToken(
        options.userId,
        options.levelName,
        options.externalActionId
      );

      if (!tokenResponse.token) {
        throw new Error("Missing access token");
      }

      // Initialize Sumsub WebSDK
      const snsWebSDK = window.SNSWebSDK.init(tokenResponse.token, {
        lang: "en",
        onMessage: (type: string, payload: any) => {
          console.log("Sumsub message:", type, payload);

          if (type === "idCheck.onApplicantStatusChanged") {
            const status = payload.reviewStatus;
            if (status === "completed" || status === "approved") {
              options.onComplete?.(payload);
            }
          }
        },
        onEvent: (type: string, payload: any) => {
          console.log("Sumsub event:", type, payload);
        },
      });

      setSdkInstance(snsWebSDK);
      setIsLoading(false);

      return snsWebSDK;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to initialize Sumsub";
      setError(errorMessage);
      setIsLoading(false);
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    }
  }, [options.userId, options.levelName, options.externalActionId]);

  const loadSumsubScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.SNSWebSDK) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://static.sumsub.com/idensic/static/sns-web-sdk-build/sns-web-sdk.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Sumsub WebSDK script"));
      document.head.appendChild(script);
    });
  };

  const unmount = useCallback(() => {
    if (sdkInstance) {
      try {
        sdkInstance.unmount();
        setSdkInstance(null);
      } catch (e) {
        console.error("Error unmounting Sumsub:", e);
      }
    }
  }, [sdkInstance]);

  return {
    launchKyc,
    unmount,
    isLoading,
    error,
    sdkInstance,
  };
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SNSWebSDK: {
      init: (accessToken: string, options?: any) => {
        mount: (element: HTMLElement) => void;
        unmount: () => void;
      };
    };
  }
}
