import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Define types for the component
interface FilterState {
  query: string;
  fileTypes: string[];
  dateRange: { start: string; end: string };
  sizeRange: { min: string; max: string };
  tags: string[];
  status: string;
  sortBy: string;
  sortOrder: string;
}

interface MockSearchFiltersProps {
  onFiltersChange?: (filters: FilterState) => void;
  initialFilters?: Partial<FilterState>;
}

// Mock the search filters component
const MockSearchFilters: React.FC<MockSearchFiltersProps> = ({ onFiltersChange, initialFilters = {} }) => {
  const [filters, setFilters] = React.useState({
    query: '',
    fileTypes: [],
    dateRange: { start: '', end: '' },
    sizeRange: { min: '', max: '' },
    tags: [],
    status: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc',
    ...initialFilters
  });

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleTagAdd = (tag: string) => {
    if (tag && !filters.tags.includes(tag)) {
      const newTags = [...filters.tags, tag];
      handleFilterChange('tags', newTags);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    const newTags = filters.tags.filter(tag => tag !== tagToRemove);
    handleFilterChange('tags', newTags);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      query: '',
      fileTypes: [],
      dateRange: { start: '', end: '' },
      sizeRange: { min: '', max: '' },
      tags: [],
      status: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  return (
    <div data-testid="search-filters">
      <div className="mb-4">
        <label htmlFor="search-query" className="block text-sm font-medium mb-2">
          Search Query
        </label>
        <input
          id="search-query"
          type="text"
          value={filters.query}
          onChange={(e) => handleFilterChange('query', e.target.value)}
          placeholder="Enter search terms..."
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">File Types</label>
        <div className="space-y-2">
          {['pdf', 'docx', 'xlsx', 'txt', 'jpg', 'png'].map(type => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.fileTypes.includes(type)}
                onChange={(e) => {
                  const newTypes = e.target.checked
                    ? [...filters.fileTypes, type]
                    : filters.fileTypes.filter(t => t !== type);
                  handleFilterChange('fileTypes', newTypes);
                }}
                className="mr-2"
              />
              {type.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Date Range</label>
        <div className="flex space-x-2">
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
            className="flex-1 p-2 border rounded"
            data-testid="date-start"
          />
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
            className="flex-1 p-2 border rounded"
            data-testid="date-end"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">File Size (MB)</label>
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.sizeRange.min}
            onChange={(e) => handleFilterChange('sizeRange', { ...filters.sizeRange, min: e.target.value })}
            className="flex-1 p-2 border rounded"
            data-testid="size-min"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.sizeRange.max}
            onChange={(e) => handleFilterChange('sizeRange', { ...filters.sizeRange, max: e.target.value })}
            className="flex-1 p-2 border rounded"
            data-testid="size-max"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {filters.tags.map(tag => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center"
            >
              {tag}
              <button
                onClick={() => handleTagRemove(tag)}
                className="ml-1 text-blue-600 hover:text-blue-800"
                data-testid={`remove-tag-${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add tag and press Enter"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              handleTagAdd(target.value.trim());
              target.value = '';
            }
          }}
          className="w-full p-2 border rounded"
          data-testid="tag-input"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="status-filter" className="block text-sm font-medium mb-2">
          Status
        </label>
        <select
          id="status-filter"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Sort By</label>
        <div className="flex space-x-2">
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="flex-1 p-2 border rounded"
            data-testid="sort-by"
          >
            <option value="relevance">Relevance</option>
            <option value="uploadDate">Upload Date</option>
            <option value="filename">Filename</option>
            <option value="size">File Size</option>
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
            className="flex-1 p-2 border rounded"
            data-testid="sort-order"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      <button
        onClick={clearAllFilters}
        className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
        data-testid="clear-filters"
      >
        Clear All Filters
      </button>
    </div>
  );
};

describe('SearchFilters Component', () => {
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  it('should render all filter components', () => {
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    expect(screen.getByTestId('search-filters')).toBeInTheDocument();
    expect(screen.getByLabelText(/search query/i)).toBeInTheDocument();
    expect(screen.getByText(/file types/i)).toBeInTheDocument();
    expect(screen.getByText(/date range/i)).toBeInTheDocument();
    expect(screen.getByText(/file size \(mb\)/i)).toBeInTheDocument();
    expect(screen.getByText(/tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByText(/sort by/i)).toBeInTheDocument();
  });

  it('should handle search query input', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const searchInput = screen.getByLabelText(/search query/i);
    await user.type(searchInput, 'test document');
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'test document' })
    );
  });

  it('should handle file type selection', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
    await user.click(pdfCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ fileTypes: ['pdf'] })
    );
  });

  it('should handle multiple file type selections', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
    const docxCheckbox = screen.getByRole('checkbox', { name: /docx/i });
    
    await user.click(pdfCheckbox);
    await user.click(docxCheckbox);
    
    expect(mockOnFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ fileTypes: ['pdf', 'docx'] })
    );
  });

  it('should handle date range selection', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const startDate = screen.getByTestId('date-start');
    const endDate = screen.getByTestId('date-end');
    
    await user.type(startDate, '2024-01-01');
    await user.type(endDate, '2024-12-31');
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateRange: { start: '2024-01-01', end: '2024-12-31' }
      })
    );
  });

  it('should handle size range input', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const minSize = screen.getByTestId('size-min');
    const maxSize = screen.getByTestId('size-max');
    
    await user.type(minSize, '1');
    await user.type(maxSize, '10');
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sizeRange: { min: '1', max: '10' }
      })
    );
  });

  it('should handle tag addition', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const tagInput = screen.getByTestId('tag-input');
    await user.type(tagInput, 'important{enter}');
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['important'] })
    );
  });

  it('should handle tag removal', async () => {
    const user = userEvent.setup();
    const initialFilters = { tags: ['important', 'work'] };
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} initialFilters={initialFilters} />);
    
    const removeButton = screen.getByTestId('remove-tag-important');
    await user.click(removeButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['work'] })
    );
  });

  it('should prevent duplicate tags', async () => {
    const user = userEvent.setup();
    const initialFilters = { tags: ['important'] };
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} initialFilters={initialFilters} />);
    
    const tagInput = screen.getByTestId('tag-input');
    await user.type(tagInput, 'important{enter}');
    
    // Should not add duplicate tag
    expect(screen.getAllByText('important')).toHaveLength(1);
  });

  it('should handle status filter change', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, 'approved');
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
  });

  it('should handle sort options', async () => {
    const user = userEvent.setup();
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} />);
    
    const sortBy = screen.getByTestId('sort-by');
    const sortOrder = screen.getByTestId('sort-order');
    
    await user.selectOptions(sortBy, 'uploadDate');
    await user.selectOptions(sortOrder, 'asc');
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'uploadDate', sortOrder: 'asc' })
    );
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    const initialFilters = {
      query: 'test',
      fileTypes: ['pdf'],
      tags: ['important'],
      status: 'approved'
    };
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} initialFilters={initialFilters} />);
    
    const clearButton = screen.getByTestId('clear-filters');
    await user.click(clearButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        query: '',
        fileTypes: [],
        tags: [],
        status: 'all'
      })
    );
  });

  it('should display initial filters correctly', () => {
    const initialFilters = {
      query: 'initial search',
      fileTypes: ['pdf', 'docx'],
      tags: ['work', 'important'],
      status: 'approved'
    };
    render(<MockSearchFilters onFiltersChange={mockOnFiltersChange} initialFilters={initialFilters} />);
    
    expect(screen.getByDisplayValue('initial search')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /pdf/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /docx/i })).toBeChecked();
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Approved')).toBeInTheDocument();
  });
});
