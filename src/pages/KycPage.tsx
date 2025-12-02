import { useState, useEffect } from 'react';
import { SumsubKyc } from '../components/SumsubKyc';
import './KycPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function KycPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract JWT access token from URL parameters (from onboarding links)
    const urlParams = new URLSearchParams(window.location.search);
    const jwtFromUrl = urlParams.get('accessToken');

    if (jwtFromUrl) {
      // Generate Sumsub access token using the JWT
      generateSumsubToken(jwtFromUrl);
    } else {
      // Also listen for postMessage from mobile app (alternative method)
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SUMSUB_ACCESS_TOKEN') {
          setAccessToken(event.data.accessToken);
          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  const generateSumsubToken = async (jwt: string) => {
    try {
      // Call backend to generate Sumsub access token using the JWT
      const response = await fetch(`${API_URL}/kyc/sumsub/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to generate KYC access token');
      }

      const data = await response.json();
      setAccessToken(data.data.token);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize KYC verification');
    } finally {
      setLoading(false);
    }
  };

  // Hide/show Tawk.to widget based on KYC state
  useEffect(() => {
    if (accessToken) {
      const hideTawkWidget = () => {
        if (
          window.Tawk_API &&
          typeof window.Tawk_API.hideWidget === 'function'
        ) {
          window.Tawk_API.hideWidget();
        }
      };

      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
        hideTawkWidget();
      } else {
        const checkInterval = setInterval(() => {
          if (
            window.Tawk_API &&
            typeof window.Tawk_API.hideWidget === 'function'
          ) {
            hideTawkWidget();
            clearInterval(checkInterval);
          }
        }, 100);

        setTimeout(() => clearInterval(checkInterval), 5000);

        return () => {
          clearInterval(checkInterval);
          if (
            window.Tawk_API &&
            typeof window.Tawk_API.showWidget === 'function'
          ) {
            window.Tawk_API.showWidget();
          }
        };
      }

      return () => {
        if (
          window.Tawk_API &&
          typeof window.Tawk_API.showWidget === 'function'
        ) {
          window.Tawk_API.showWidget();
        }
      };
    } else {
      if (window.Tawk_API && typeof window.Tawk_API.showWidget === 'function') {
        window.Tawk_API.showWidget();
      }
    }
  }, [accessToken, error]);

  if (loading) {
    return (
      <div className="kyc-container">
        <div className="kyc-loading">
          <div className="spinner"></div>
          <h2>Initializing KYC Verification...</h2>
          <p>Please wait while we set things up</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kyc-container">
        <div className="kyc-error">
          <div className="error-icon">⚠️</div>
          <h2>Verification Error</h2>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="kyc-container">
        <div className="kyc-waiting">
          <h2>KYC Verification</h2>
          <p>Waiting for access token...</p>
          <p className="help-text">
            If you're testing directly, add ?accessToken=YOUR_JWT_TOKEN to the URL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-container">
      <SumsubKyc
        accessToken={accessToken}
        onComplete={(result) => {
          console.log('KYC completed:', result);

          if (
            window.Tawk_API &&
            typeof window.Tawk_API.showWidget === 'function'
          ) {
            window.Tawk_API.showWidget();
          }

          // Notify mobile app or parent window
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'KYC_COMPLETED',
                result: result,
              })
            );
          } else {
            window.parent.postMessage(
              {
                type: 'KYC_COMPLETED',
                result: result,
              },
              '*'
            );
          }
        }}
        onError={(error) => {
          console.error('KYC error:', error);

          if (
            window.Tawk_API &&
            typeof window.Tawk_API.showWidget === 'function'
          ) {
            window.Tawk_API.showWidget();
          }

          // Notify mobile app or parent window
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'KYC_ERROR',
                error: error.message,
              })
            );
          } else {
            window.parent.postMessage(
              {
                type: 'KYC_ERROR',
                error: error.message,
              },
              '*'
            );
          }

          setError(error.message);
        }}
        onStatusChange={(status) => {
          console.log('KYC status changed:', status);

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: 'KYC_STATUS_CHANGED',
                status: status,
              })
            );
          }
        }}
      />
    </div>
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

export default KycPage;
