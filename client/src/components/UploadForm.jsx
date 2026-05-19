import { useRef, useState } from 'react';
import { api } from '../api.js';

export function UploadForm({ onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setStatus('');
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(f.type)) {
      setFile(null);
      setPreview(null);
      setStatus('Please choose a JPG or PNG image.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus('Select an image first.');
      return;
    }
    setUploading(true);
    setStatus('');
    const form = new FormData();
    form.append('image', file);
    try {
      const { data } = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(data);
      setStatus('Saved and analyzed.');
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setStatus(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="card upload-card">
      <h2 className="card-title">Upload a receipt</h2>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-label">
          <span className="btn secondary">Choose image</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            className="visually-hidden"
            onChange={onFileChange}
          />
        </label>
        {preview && (
          <div className="preview-wrap">
            <img src={preview} alt="Receipt preview" className="preview-img" />
          </div>
        )}
        <button type="submit" className="btn primary" disabled={uploading || !file}>
          {uploading ? 'Analyzing…' : 'Analyze & save'}
        </button>
      </form>
      {status && <p className={`form-status ${status.includes('failed') || status.includes('Please') ? 'text-error' : 'muted'}`}>{status}</p>}
    </section>
  );
}
