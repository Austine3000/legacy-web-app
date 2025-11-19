const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5050";

interface SumsubAccessTokenResponse {
  token: string;
  ttlInSecs?: number;
  expiresAt?: string;
  inspectionId?: string;
  applicantId?: string;
  externalActionId?: string;
}

export const kycService = {
  /**
   * Generate Sumsub access token from backend
   * @param userId - User ID for the access token
   * @param levelName - Optional level name override
   * @param externalActionId - Optional external action ID
   */
  async generateSumsubAccessToken(
    userId: string,
    levelName?: string,
    externalActionId?: string
  ): Promise<SumsubAccessTokenResponse> {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(`${API_BASE_URL}/kyc/sumsub/access-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        userId,
        ...(levelName && { levelName }),
        ...(externalActionId && { externalActionId }),
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to generate access token" }));
      throw new Error(
        error.message || "Failed to generate Sumsub access token"
      );
    }

    const data = await response.json();
    return data.data || data;
  },
};
