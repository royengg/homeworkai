import axios from "axios";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export async function wrap<T>(promise: Promise<T>): Promise<ServiceResponse<T>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (err: any) {
    // Axios cancellation (AbortController / component unmount) is not a
    // user-facing error — return a silent null so callers that react to
    // `error` don't surface a "canceled" banner when StrictMode unmounts
    // or navigation aborts an in-flight request.
    if (axios.isCancel(err) || err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
      return { data: null, error: null };
    }
    const message =
      err?.message || err?.response?.data?.error || "An unexpected error occurred";
    return { data: null, error: message };
  }
}
