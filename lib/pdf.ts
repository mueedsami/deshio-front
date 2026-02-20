import axiosInstance from '@/lib/axios';

/**
 * Download/preview a PDF that requires Bearer auth.
 *
 * Why: window.open() cannot send Authorization headers, so protected PDF endpoints
 * often redirect to backend login. This helper fetches the PDF as a blob using
 * axios (which attaches the token) and then opens/downloads it from a blob URL.
 */
export async function fetchPdfBlobUrl(pathOrUrl: string): Promise<{ blobUrl: string; blob: Blob }> {
  const res = await axiosInstance.get(pathOrUrl, {
    responseType: 'blob',
    headers: {
      // Include JSON in Accept + XHR header so Laravel auth middleware doesn't
      // redirect to web login on 401 (common when endpoints live under web guard).
      Accept: 'application/pdf,application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  const blob = new Blob([res.data], { type: 'application/pdf' });
  const blobUrl = window.URL.createObjectURL(blob);
  return { blobUrl, blob };
}

export async function previewPdf(pathOrUrl: string): Promise<void> {
  // Open a blank tab first to avoid popup blockers in some browsers.
  const win = window.open('', '_blank', 'noopener,noreferrer');

  try {
    const { blobUrl } = await fetchPdfBlobUrl(pathOrUrl);
    if (win) {
      win.location.href = blobUrl;
    } else {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }

    // Revoke later (keep it long enough for printing / viewing)
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
  } catch (e) {
    if (win) win.close();
    throw e;
  }
}

export async function downloadPdf(pathOrUrl: string, filename: string): Promise<void> {
  const { blobUrl } = await fetchPdfBlobUrl(pathOrUrl);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60 * 1000);
}
