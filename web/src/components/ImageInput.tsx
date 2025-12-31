import { useState } from 'react';
import axios from 'axios';
import { Upload, Link as LinkIcon, Image as ImageIcon, Loader2, X } from 'lucide-react';

interface ImageInputProps {
    label: string;
    value: string;
    gameId: string;
    type: string;
    onChange: (url: string) => void;
}

const API_URL = 'http://localhost:4000/api';

export const ImageInput = ({ label, value, gameId, type, onChange }: ImageInputProps) => {
    const [uploading, setUploading] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!gameId) {
            alert("Por favor, define el 'ID Slug' antes de subir imágenes.");
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('gameId', gameId);
            formData.append('type', type);

            const res = await axios.post(`${API_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onChange(res.data.url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Error subiendo la imagen.");
        } finally {
            setUploading(false);
        }
    };

    const getPreviewUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:4000${url}`;
    };

    return (
        <>
            <div className="space-y-2 p-3 bg-slate-800/20 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
                    {value && <span className="text-[10px] text-emerald-400 font-mono bg-emerald-400/10 px-2 py-0.5 rounded-full">Linked</span>}
                </div>

                <div className="flex gap-4 items-start">
                    {/* Preview */}
                    <div className="relative w-20 h-20 shrink-0 bg-slate-900 rounded-lg border border-slate-700/50 overflow-hidden group shadow-inner cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={() => value && setIsZoomed(true)}>
                        {value ? (
                            <img
                                src={getPreviewUrl(value)}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=?'}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <ImageIcon size={24} />
                            </div>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                <Loader2 className="animate-spin text-white" size={20} />
                            </div>
                        )}
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 space-y-3">
                        <div className="relative group">
                            <LinkIcon className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={14} />
                            <input
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-blue-400 focus:border-indigo-500 focus:bg-slate-900 outline-none transition-all truncate font-mono placeholder-slate-600"
                                placeholder={`URL...`}
                                value={value}
                                onChange={e => onChange(e.target.value)}
                            />
                        </div>

                        <div className="flex">
                            <label className={`
                    flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 rounded-lg cursor-pointer transition-all text-xs font-medium text-slate-300 shadow-sm
                    ${!gameId ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                 `}>
                                <Upload size={14} />
                                <span>Subir Archivo</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={!gameId || uploading}
                                />
                            </label>
                            {!gameId && <span className="text-[10px] text-amber-500/80 ml-3 self-center italic">Define ID primero</span>}
                        </div>
                    </div>
                </div>
            </div>


            {/* Zoom Modal */}
            {
                isZoomed && value && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setIsZoomed(false)}>
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            onClick={() => setIsZoomed(false)}
                        >
                            <X size={32} />
                        </button>
                        <img
                            src={getPreviewUrl(value)}
                            alt="Full Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                )
            }
        </>
    );
};
