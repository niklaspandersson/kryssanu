/**
 * Downscale an image File in the browser before upload: caps the longest edge
 * at `maxEdge` and re-encodes as JPEG. This keeps uploads small (well under the
 * PHP server's default 2MB limit) and offloads the heavy resize from the
 * server. The backend still generates its own display/thumb variants.
 *
 * Falls back to the original file if anything goes wrong (e.g. an unsupported
 * format or a decode error) so an upload is never blocked by this optimisation.
 */
export async function downscaleImage(
  file: File,
  maxEdge = 1600,
  quality = 0.82,
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));

    // Already small enough — no point re-encoding.
    if (scale === 1) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
