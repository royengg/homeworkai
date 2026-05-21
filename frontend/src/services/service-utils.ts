export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export async function wrap<T>(promise: Promise<T>): Promise<ServiceResponse<T>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (err: any) {
    const message =
      err?.message || err?.response?.data?.error || "An unexpected error occurred";
    return { data: null, error: message };
  }
}
