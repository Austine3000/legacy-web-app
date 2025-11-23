import { useState, useEffect } from "react";
import "./App.css";
import { SumsubKyc } from "./components/SumsubKyc";

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract access token from URL parameters (passed from mobile app webview)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("accessToken");

    if (tokenFromUrl) {
      setAccessToken(tokenFromUrl);
    } else {
      // Also listen for postMessage from mobile app (alternative method)
      const handleMessage = (event: MessageEvent) => {
        // Verify origin if needed for security
        // if (event.origin !== 'expected-origin') return;

        if (event.data && event.data.type === "SUMSUB_ACCESS_TOKEN") {
          setAccessToken(event.data.accessToken);
        }
      };

      window.addEventListener("message", handleMessage);

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }
  }, []);

  // Hide/show Tawk.to widget based on KYC state
  useEffect(() => {
    // Hide Tawk.to widget when KYC is active (accessToken exists)
    if (accessToken) {
      // Wait for Tawk.to to be fully loaded before trying to hide it
      const hideTawkWidget = () => {
        if (
          window.Tawk_API &&
          typeof window.Tawk_API.hideWidget === "function"
        ) {
          window.Tawk_API.hideWidget();
        }
      };

      // Try to hide immediately if Tawk_API is already available
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === "function") {
        hideTawkWidget();
      } else {
        // Wait for Tawk.to to load (it loads asynchronously)
        const checkInterval = setInterval(() => {
          if (
            window.Tawk_API &&
            typeof window.Tawk_API.hideWidget === "function"
          ) {
            hideTawkWidget();
            clearInterval(checkInterval);
          }
        }, 100);

        // Clear interval after 5 seconds if Tawk.to doesn't load
        setTimeout(() => clearInterval(checkInterval), 5000);

        return () => {
          clearInterval(checkInterval);
          // Show widget again when KYC ends
          if (
            window.Tawk_API &&
            typeof window.Tawk_API.showWidget === "function"
          ) {
            window.Tawk_API.showWidget();
          }
        };
      }

      return () => {
        // Show widget again when KYC ends
        if (
          window.Tawk_API &&
          typeof window.Tawk_API.showWidget === "function"
        ) {
          window.Tawk_API.showWidget();
        }
      };
    } else {
      // Show widget when not in KYC mode
      if (window.Tawk_API && typeof window.Tawk_API.showWidget === "function") {
        window.Tawk_API.showWidget();
      }
    }
  }, [accessToken, error]);

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Legacy Web App</h1>
        <p style={{ color: "red" }}>Error: {error}</p>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h1>Legacy Web App</h1>
        <p>Waiting for access token from mobile app...</p>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
          If you're testing directly, add ?accessToken=YOUR_TOKEN to the URL
        </p>
      </div>
    );
  }

  return (
    <>
      <SumsubKyc
        accessToken={accessToken}
        onComplete={(result) => {
          console.log("KYC completed:", result);

          // Show Tawk.to widget again after KYC completes
          if (
            window.Tawk_API &&
            typeof window.Tawk_API.showWidget === "function"
          ) {
            window.Tawk_API.showWidget();
          }

          // Notify mobile app that KYC is complete
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "KYC_COMPLETED",
                result: result,
              })
            );
          } else {
            // Fallback for testing in browser
            window.parent.postMessage(
              {
                type: "KYC_COMPLETED",
                result: result,
              },
              "*"
            );
          }
        }}
        onError={(error) => {
          console.error("KYC error:", error);

          // Show Tawk.to widget again after KYC error
          if (
            window.Tawk_API &&
            typeof window.Tawk_API.showWidget === "function"
          ) {
            window.Tawk_API.showWidget();
          }

          // Notify mobile app of error
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "KYC_ERROR",
                error: error.message,
              })
            );
          } else {
            window.parent.postMessage(
              {
                type: "KYC_ERROR",
                error: error.message,
              },
              "*"
            );
          }

          setError(error.message);
        }}
        onStatusChange={(status) => {
          console.log("KYC status changed:", status);

          // Optionally notify mobile app of status changes
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: "KYC_STATUS_CHANGED",
                status: status,
              })
            );
          }
        }}
      />
    </>
  );
}

// TypeScript declarations
declare global {
  interface Window {
    Tawk_API?: {
      hideWidget: () => void;
      showWidget: () => void;
      [key: string]: any;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export default App;
