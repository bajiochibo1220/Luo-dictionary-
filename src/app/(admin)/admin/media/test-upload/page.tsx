"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function TestUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function upload() {
    if (!file) {
      toast.error("Pick a file first");
      return;
    }
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("languageCode", "luo");
      formData.append("moduleCode", "proverbs");
      formData.append("recordId", "unassigned");
      formData.append(
        "assetType",
        file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "audio"
      );

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Upload failed");
        setResult(json);
        return;
      }

      toast.success("Uploaded!");
      setResult(json.data);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-serif text-stone-800 mb-1">
          Test Upload
        </h1>
        <p className="text-sm text-stone-500">
          Temporary page to test Cloudinary upload. Remove after verification.
        </p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8">
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Choose a file (image, video, or audio)
        </label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 mb-6"
        />

        {file && (
          <div className="text-xs text-stone-500 mb-4 space-y-1">
            <p>
              <strong>Name:</strong> {file.name}
            </p>
            <p>
              <strong>Type:</strong> {file.type}
            </p>
            <p>
              <strong>Size:</strong> {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        )}

        <button
          onClick={upload}
          disabled={!file || uploading}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload to Cloudinary"}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
            <p className="text-xs uppercase tracking-wider text-stone-400 mb-2">
              Result
            </p>
            <pre className="text-xs text-stone-700 overflow-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.url && (
              <div className="mt-3 space-y-2">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 hover:underline text-sm block"
                >
                  Open uploaded file →
                </a>
                <a
                  href="/admin/media"
                  className="text-amber-600 hover:underline text-sm block"
                >
                  Go to Media Library →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}