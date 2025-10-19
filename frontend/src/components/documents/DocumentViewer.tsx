import { useState, useEffect } from 'react';
import { documentsApi, S3Object, ListDocumentsResponse } from '@/services/documents.ts';
import './DocumentViewer.css';

interface DocumentViewerProps {
    onUpload?: (file: File) => void;
    isUploading?: boolean;
}

export default function DocumentViewer({ onUpload, isUploading }: DocumentViewerProps) {
    const [documents, setDocuments] = useState<S3Object[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const response: ListDocumentsResponse = await documentsApi.listDocuments();
            setDocuments(response.objects);
        } catch (err) {
            setError('Failed to load documents');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploadProgress(true);
        setError(null);

        try {
            const result = await documentsApi.uploadDocument(selectedFile);

            if (result.success) {
                // Refresh the document list
                await loadDocuments();
                setSelectedFile(null);

                // Reset file input
                const fileInput = document.getElementById('file-input') as HTMLInputElement;
                if (fileInput) fileInput.value = '';

                // Call optional callback
                if (onUpload) {
                    onUpload(selectedFile);
                }
            } else {
                setError(result.error || 'Upload failed');
            }
        } catch (err) {
            setError('Upload failed');
            console.error(err);
        } finally {
            setUploadProgress(false);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getFileExtension = (filename: string): string => {
        return filename.split('.').pop()?.toUpperCase() || 'FILE';
    };

    const getFileIcon = (filename: string): string => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const iconMap: { [key: string]: string } = {
            pdf: '📄',
            doc: '📝',
            docx: '📝',
            txt: '📃',
            jpg: '🖼️',
            jpeg: '🖼️',
            png: '🖼️',
            gif: '🖼️',
            zip: '🗜️',
            csv: '📊',
            xls: '📊',
            xlsx: '📊',
        };
        return iconMap[ext || ''] || '📎';
    };

    return (
        <div className="document-viewer">
            <header className="document-viewer-header">
                <h1>📁 Document Library</h1>
                <p className="subtitle">
                    {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                </p>
            </header>

            {/* Upload Section */}
            <div className="upload-section">
                <div className="upload-card">
                    <input
                        type="file"
                        id="file-input"
                        onChange={handleFileSelect}
                        disabled={uploadProgress || isUploading}
                        className="file-input"
                    />
                    <label htmlFor="file-input" className="file-input-label">
                        <span className="upload-icon">⬆️</span>
                        <span className="upload-text">
                            {selectedFile ? selectedFile.name : 'Choose a file to upload'}
                        </span>
                    </label>

                    {selectedFile && (
                        <button
                            onClick={handleUpload}
                            disabled={uploadProgress || isUploading}
                            className="upload-button"
                        >
                            {uploadProgress || isUploading ? (
                                <>
                                    <span className="spinner"></span>
                                    Uploading...
                                </>
                            ) : (
                                <>Upload</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    ⚠️ {error}
                    <button onClick={() => setError(null)} className="error-close">×</button>
                </div>
            )}

            {/* Controls */}
            <div className="controls">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="view-controls">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                        title="Grid view"
                    >
                        ▦
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                        title="List view"
                    >
                        ☰
                    </button>
                    <button
                        onClick={loadDocuments}
                        className="refresh-button"
                        disabled={loading}
                        title="Refresh"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Documents Display */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner large"></div>
                    <p>Loading documents...</p>
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <h3>No documents found</h3>
                    <p>
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Upload your first document to get started'}
                    </p>
                </div>
            ) : (
                <div className={`documents-container ${viewMode}`}>
                    {filteredDocuments.map((doc) => (
                        <div key={doc.key} className="document-card">
                            <div className="document-icon">
                                {getFileIcon(doc.key)}
                            </div>
                            <div className="document-info">
                                <h3 className="document-name" title={doc.key}>
                                    {doc.key}
                                </h3>
                                <div className="document-meta">
                                    <span className="document-size">
                                        {documentsApi.formatFileSize(doc.size)}
                                    </span>
                                    <span className="document-date">
                                        {new Date(doc.last_modified).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="document-actions">
                                <a
                                    href={documentsApi.getDocumentUrl(doc.key)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="action-button"
                                    title="View document"
                                >
                                    👁️
                                </a>
                                <a
                                    href={documentsApi.getDocumentUrl(doc.key)}
                                    download
                                    className="action-button"
                                    title="Download document"
                                >
                                    ⬇️
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}