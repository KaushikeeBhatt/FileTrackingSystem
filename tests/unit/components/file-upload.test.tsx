import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

interface MockFileUploadProps {
  onUpload?: (files: File[]) => void;
  maxSize?: number;
  allowedTypes?: string[];
}

const MockFileUpload = ({ onUpload, maxSize = 50 * 1024 * 1024, allowedTypes = [] }: MockFileUploadProps) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [error, setError] = React.useState('');

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    setError('');
    
    for (const file of files) {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
        return;
      }
      
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        setError(`File type ${file.type} is not allowed`);
        return;
      }
    }

    // Simulate upload progress
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          onUpload?.(files);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  return (
    <div data-testid="file-upload">
      <div
        data-testid="drop-zone"
        className={`border-2 border-dashed p-8 text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drag and drop files here or click to select</p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          data-testid="file-input"
          className="mt-4"
        />
      </div>
      
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div data-testid="progress-bar" className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
        </div>
      )}
      
      {error && (
        <div data-testid="error-message" className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

describe('FileUpload Component', () => {
  const mockOnUpload = jest.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  it('should render file upload component', () => {
    render(<MockFileUpload onUpload={mockOnUpload} />);
    
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  it('should handle file selection via input', async () => {
    const user = userEvent.setup();
    render(<MockFileUpload onUpload={mockOnUpload} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([file]);
    }, { timeout: 2000 });
  });

  it('should show drag and drop visual feedback', () => {
    render(<MockFileUpload onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByTestId('drop-zone');
    
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-blue-500', 'bg-blue-50');
    
    fireEvent.dragLeave(dropZone);
    expect(dropZone).toHaveClass('border-gray-300');
    expect(dropZone).not.toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('should handle file drop', async () => {
    render(<MockFileUpload onUpload={mockOnUpload} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const dropZone = screen.getByTestId('drop-zone');
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([file]);
    }, { timeout: 2000 });
  });

  it('should show upload progress', async () => {
    render(<MockFileUpload onUpload={mockOnUpload} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });
  });

  it('should reject oversized files', async () => {
    const maxSize = 1024; // 1KB
    render(<MockFileUpload onUpload={mockOnUpload} maxSize={maxSize} />);
    
    const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, largeFile);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(/too large/i)).toBeInTheDocument();
    });
    
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('should reject disallowed file types', async () => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    render(<MockFileUpload onUpload={mockOnUpload} allowedTypes={allowedTypes} />);
    
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, textFile);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(/not allowed/i)).toBeInTheDocument();
    });
    
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('should handle multiple file uploads', async () => {
    render(<MockFileUpload onUpload={mockOnUpload} />);
    
    const files = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    ];
    const input = screen.getByTestId('file-input');
    
    await userEvent.upload(input, files);
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(files);
    }, { timeout: 2000 });
  });

  it('should clear error message on successful upload', async () => {
    const maxSize = 1024;
    render(<MockFileUpload onUpload={mockOnUpload} maxSize={maxSize} />);
    
    const input = screen.getByTestId('file-input');
    
    // First upload a large file to trigger error
    const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
    await userEvent.upload(input, largeFile);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });
    
    // Then upload a valid file
    const validFile = new File(['small'], 'small.txt', { type: 'text/plain' });
    await userEvent.upload(input, validFile);
    
    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });
});
