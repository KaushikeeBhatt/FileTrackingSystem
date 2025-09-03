"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import { Search, Filter, CalendarIcon, X, Save, History } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { authFetch } from "@/lib/auth-fetch"

interface SearchFilters {
  query: string
  status: string
  category: string
  department: string
  uploadedBy: string
  dateFrom?: Date
  dateTo?: Date
  fileType: string
  tags: string[]
  minSize?: number
  maxSize?: number
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  onReset: () => void
}

export function AdvancedSearch({ onSearch, onReset }: AdvancedSearchProps) {
  const { user } = useAuth()
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    status: "all",
    category: "all",
    department: "all",
    uploadedBy: "all",
    fileType: "all",
    tags: [],
  })

  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [tagInput, setTagInput] = useState("")

  // Fetch search suggestions
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await authFetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`)

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error)
    }
  }

  // Fetch saved searches
  const fetchSavedSearches = async () => {
    try {
      const response = await authFetch("/api/search/saved")

      if (response.ok) {
        const data = await response.json()
        setSavedSearches(data.searches)
      }
    } catch (error) {
      console.error("Failed to fetch saved searches:", error)
    }
  }

  useEffect(() => {
    fetchSavedSearches()
  }, [])

  const handleQueryChange = (value: string) => {
    setFilters((prev) => ({ ...prev, query: value }))
    setShowSuggestions(true)
    fetchSuggestions(value)
  }

  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === "file" || suggestion.type === "tag") {
      setFilters((prev) => ({ ...prev, query: suggestion.value }))
    } else if (suggestion.type === "category") {
      setFilters((prev) => ({ ...prev, category: suggestion.value }))
    } else if (suggestion.type === "department") {
      setFilters((prev) => ({ ...prev, department: suggestion.value }))
    }
    setShowSuggestions(false)
  }

  const addTag = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      setFilters((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }))
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleSearch = () => {
    onSearch(filters)
  }

  const handleReset = () => {
    setFilters({
      query: "",
      status: "all",
      category: "all",
      department: "all",
      uploadedBy: "all",
      fileType: "all",
      tags: [],
    })
    onReset()
  }

  const saveSearch = async () => {
    try {
      await authFetch("/api/search/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchQuery: filters.query,
          filters,
        }),
      })
      fetchSavedSearches()
    } catch (error) {
      console.error("Failed to save search:", error)
    }
  }

  const loadSavedSearch = (savedSearch: any) => {
    setFilters({
      query: savedSearch.searchQuery,
      ...savedSearch.filters,
    })
    onSearch({
      query: savedSearch.searchQuery,
      ...savedSearch.filters,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Advanced Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Query with Suggestions */}
        <div className="space-y-2 relative">
          <Label htmlFor="search-query">Search Query</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="search-query"
              placeholder="Search files, tags, descriptions..."
              value={filters.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10"
            />
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto">
              <CardContent className="p-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                      <span className="text-sm">{suggestion.value}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.count}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="images">Images</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
                <SelectItem value="presentations">Presentations</SelectItem>
                <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
                <SelectItem value="archives">Archives</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>File Type</Label>
            <Select
              value={filters.fileType}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, fileType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image/">Images</SelectItem>
                <SelectItem value="video/">Videos</SelectItem>
                <SelectItem value="application/pdf">PDF</SelectItem>
                <SelectItem value="application/msword">Word Documents</SelectItem>
                <SelectItem value="application/vnd.ms-excel">Excel Files</SelectItem>
                <SelectItem value="text/">Text Files</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => setFilters((prev) => ({ ...prev, dateFrom: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Date To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? format(filters.dateTo, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => setFilters((prev) => ({ ...prev, dateTo: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* File Size Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min-size">Min Size (MB)</Label>
            <Input
              id="min-size"
              type="number"
              placeholder="0"
              value={filters.minSize ? filters.minSize / 1024 / 1024 : ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  minSize: e.target.value ? Number.parseFloat(e.target.value) * 1024 * 1024 : undefined,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-size">Max Size (MB)</Label>
            <Input
              id="max-size"
              type="number"
              placeholder="100"
              value={filters.maxSize ? filters.maxSize / 1024 / 1024 : ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  maxSize: e.target.value ? Number.parseFloat(e.target.value) * 1024 * 1024 : undefined,
                }))
              }
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTag()}
            />
            <Button onClick={addTag} variant="outline">
              Add
            </Button>
          </div>
          {filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Recent Searches
            </Label>
            <div className="flex flex-wrap gap-2">
              {savedSearches.slice(0, 5).map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedSearch(search)}
                  className="text-xs"
                >
                  {search.searchQuery || "Advanced Search"}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleSearch} className="flex-1">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button onClick={saveSearch} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
