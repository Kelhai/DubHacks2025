const API_BASE_URL = 'https://ajtd1wi2z1.execute-api.us-east-2.amazonaws.com';

export interface S3Object {
    key: string;
    size: number;
    last_modified: string;
}

export interface ListDocumentsResponse {
    bucket: string;
    object_count: number;
    objects: S3Object[];
}

export const documentsApi = {
    async uploadDocument(file: File): Promise<{ success: boolean; document?: any; error?: string }> {
        try {
            const base64 = await fileToBase64(file);

            const response = await fetch(`${API_BASE_URL}/bucket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: base64,
                    filename: file.name,
                }),
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            return { success: true, document: data };
        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
            };
        }
    },

    async listDocuments(): Promise<ListDocumentsResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/bucket`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch documents: ${response.statusText}`);
            }

            const data: ListDocumentsResponse = await response.json();
            return data;
        } catch (error) {
            console.error('List documents error:', error);
            return {
                bucket: '',
                object_count: 0,
                objects: []
            };
        }
    },

    getDocumentUrl(key: string): string {
        // You might need to adjust this based on how your API serves files
        return `${API_BASE_URL}/bucket/${encodeURIComponent(key)}`;
    },

    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
};

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
    });
}