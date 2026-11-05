import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Check, 
  Sparkles,
  FileImage
} from 'lucide-react';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertMedia: (url: string, altText: string) => void;
}

// Curated stock photos for media insertion
const MEDIA_STOCK_PRESETS = [
  { title: 'AI & Neural Networks', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80', tag: 'Tech' },
  { title: 'Cyber Security & Code', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80', tag: 'Security' },
  { title: 'Server Data Center', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80', tag: 'Infrastructure' },
  { title: 'Modern Workspace & Laptop', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80', tag: 'Business' },
  { title: 'Mobility & EV Future', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80', tag: 'Automotive' },
  { title: 'Microchip Architecture', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80', tag: 'Hardware' },
  { title: 'Digital World Grid', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80', tag: 'Network' },
  { title: 'Smart Mobile Device', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=80', tag: 'Mobile' },
];

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onInsertMedia
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'presets' | 'url'>('upload');
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [altText, setAltText] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle local file selection
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WebP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setUploadPreview(result);
        setSelectedUrl(result);
        if (!altText) {
          setAltText(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleInsert = () => {
    let finalUrl = '';
    if (activeTab === 'upload') {
      finalUrl = uploadPreview;
    } else if (activeTab === 'presets') {
      finalUrl = selectedUrl;
    } else if (activeTab === 'url') {
      finalUrl = customUrlInput;
    }

    if (!finalUrl) {
      alert('Vui lòng chọn hoặc nhập đường dẫn hình ảnh.');
      return;
    }

    const cleanAlt = altText.trim() || 'Hình ảnh minh họa';
    onInsertMedia(finalUrl, cleanAlt);
    
    // Reset and close
    setUploadPreview('');
    setSelectedUrl('');
    setCustomUrlInput('');
    setAltText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                Add Media / Thêm Hình Ảnh
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tải ảnh lên từ máy tính, chọn kho ảnh mẫu hoặc nhập URL
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-slate-50/50 dark:bg-slate-950/50 gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File (Từ máy)</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'presets'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Kho ảnh mẫu</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'url'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Đường dẫn URL</span>
          </button>
        </div>

        {/* Body Content based on Active Tab */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Tab 1: Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center ${
                  dragActive
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/50'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/50'
                }`}
              >
                {uploadPreview ? (
                  <div className="relative group w-full max-w-md aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
                    <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => { setUploadPreview(''); setSelectedUrl(''); }}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow hover:bg-rose-500"
                      >
                        Đổi hình khác
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Kéo thả hình ảnh vào đây hoặc click để chọn tệp
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Hỗ trợ PNG, JPG, WebP, GIF, SVG (Hình ảnh sẽ được chèn trực tiếp)
                    </p>

                    <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow">
                      <span>Chọn tệp ảnh từ thiết bị</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Stock Presets */}
          {activeTab === 'presets' && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Chọn một trong các hình ảnh chất lượng cao để chèn vào bài viết:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {MEDIA_STOCK_PRESETS.map((preset, idx) => {
                  const isSelected = selectedUrl === preset.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedUrl(preset.url);
                        if (!altText) setAltText(preset.title);
                      }}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 text-left transition group ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/50 scale-[1.02]'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                      }`}
                    >
                      <img src={preset.url} alt={preset.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent p-2 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">
                          {preset.tag}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {preset.title}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Đường dẫn hình ảnh (Direct Image URL)
              </label>
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
              />

              {customUrlInput && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1">Xem trước hình ảnh:</p>
                  <div className="max-w-xs aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={customUrlInput}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Invalid+Image+URL';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Common Alt Text / Caption Field */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Alt Text / Chú thích hình ảnh (Tùy chọn)
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Ví dụ: Sơ đồ hệ thống bảo mật WAF..."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Mô tả hình ảnh hỗ trợ SEO và hiển thị làm chú thích chân thực cho bài viết.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Chèn vào bài viết</span>
          </button>
        </div>
      </div>
    </div>
  );
};
