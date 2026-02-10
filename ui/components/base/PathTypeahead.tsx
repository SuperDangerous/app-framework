import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Folder, File, ChevronRight, Loader2 } from 'lucide-react';
import { Input } from './input';
import { useDebounce } from '../../src/hooks/useDebounce';
import { cn } from '../../src/utils/cn';

interface PathSuggestion {
  path: string;
  name: string;
  isDirectory: boolean;
}

interface BrowseResponse {
  items: Array<{ path: string; name: string; isDirectory: boolean }>;
  expandedPath?: string;
}

export interface PathTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onValidPath?: (expandedPath: string) => void;
  mode?: 'directory' | 'file' | 'both';
  projectId?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  /** URL for the filesystem browse endpoint. Defaults to /api/filesystem/browse */
  browseUrl?: string;
}

export function PathTypeahead({
  value,
  onChange,
  onValidPath,
  mode = 'directory',
  projectId,
  placeholder,
  className,
  error,
  disabled,
  browseUrl = '/api/filesystem/browse',
}: PathTypeaheadProps) {
  const [suggestions, setSuggestions] = useState<PathSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [expandedPath, setExpandedPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const shouldMaintainFocusRef = useRef(false);
  const isNavigatingRef = useRef(false); // True when arrow keys are being used to preview

  const debouncedValue = useDebounce(value, 200); // Faster debounce for better responsiveness

  // Fetch suggestions using unified browse endpoint
  const fetchSuggestions = useCallback(async (searchPath: string, showImmediately = false) => {
    // Cancel any pending request
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }

    if (!searchPath || searchPath.length < 1) {
      setSuggestions([]);
      setExpandedPath('');
      setIsLoading(false);
      return;
    }

    fetchControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        path: searchPath,
        mode: mode,
        limit: '20',
      });

      if (projectId) {
        params.set('projectId', projectId);
      }

      const res = await fetch(`${browseUrl}?${params.toString()}`, {
        signal: fetchControllerRef.current.signal,
      });

      // Check if this request was aborted
      if (fetchControllerRef.current?.signal.aborted) {
        return;
      }

      if (!res.ok) {
        setSuggestions([]);
        return;
      }

      const response: BrowseResponse = await res.json();

      if (response.items && response.items.length > 0) {
        const suggestionList: PathSuggestion[] = response.items.map((item) => ({
          path: item.path,
          name: item.name,
          isDirectory: item.isDirectory,
        }));
        setSuggestions(suggestionList);
        setExpandedPath(response.expandedPath || '');

        // Show suggestions if input is focused (use ref for current value) or explicitly requested
        if (shouldMaintainFocusRef.current || showImmediately) {
          setShowSuggestions(true);
        }
      } else {
        setSuggestions([]);
        setExpandedPath(response.expandedPath || '');
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch path suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [mode, projectId, browseUrl]);

  // Fetch suggestions when debounced value changes (but not during arrow navigation)
  useEffect(() => {
    // Skip fetch if user is navigating with arrow keys
    if (isNavigatingRef.current) {
      return;
    }

    if (debouncedValue && debouncedValue.length >= 1) {
      fetchSuggestions(debouncedValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setExpandedPath('');
    }
  }, [debouncedValue, fetchSuggestions]);

  // Reset selected index when suggestions change (but not during navigation)
  useEffect(() => {
    if (!isNavigatingRef.current) {
      setSelectedIndex(-1);
    }
  }, [suggestions]);

  // Synchronously restore focus before browser paint when suggestions change
  useLayoutEffect(() => {
    if (shouldMaintainFocusRef.current && inputRef.current) {
      if (document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [suggestions, showSuggestions]);

  // Notify parent of expanded path
  useEffect(() => {
    if (expandedPath && onValidPath) {
      onValidPath(expandedPath);
    }
  }, [expandedPath, onValidPath]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutside =
        suggestionsRef.current && !suggestionsRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target);

      if (isOutside) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Populate input with suggestion path (for keyboard navigation preview)
  const previewSuggestion = (index: number) => {
    if (index >= 0 && index < suggestions.length) {
      isNavigatingRef.current = true;
      onChange(suggestions[index]!.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const hasSuggestions = suggestions.length > 0;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (hasSuggestions) {
          // Open dropdown if closed, otherwise navigate
          if (!showSuggestions) {
            setShowSuggestions(true);
            setSelectedIndex(0);
            previewSuggestion(0);
          } else {
            const newIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
            setSelectedIndex(newIndex);
            previewSuggestion(newIndex);
          }
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (hasSuggestions && showSuggestions) {
          const newIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
          setSelectedIndex(newIndex);
          previewSuggestion(newIndex);
        }
        break;

      case 'Enter':
        if (showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex]!);
        }
        // If no selection, let Enter pass through for form submission
        break;

      case 'Escape':
        if (showSuggestions) {
          e.preventDefault();
          e.stopPropagation(); // Prevent closing parent dialogs
          isNavigatingRef.current = false;
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
        break;

      case 'Tab':
        if (hasSuggestions && showSuggestions) {
          e.preventDefault();

          // If one suggestion or one selected, complete it
          if (suggestions.length === 1) {
            selectSuggestion(suggestions[0]!);
          } else if (selectedIndex >= 0) {
            selectSuggestion(suggestions[selectedIndex]!);
          } else {
            // Find common prefix for shell-like tab completion
            const commonPrefix = findCommonPrefix(suggestions.map(s => s.path));
            if (commonPrefix && commonPrefix.length > value.length) {
              onChange(commonPrefix);
            } else {
              // Just select first item
              setSelectedIndex(0);
            }
          }
        }
        break;
    }
  };

  const selectSuggestion = (suggestion: PathSuggestion) => {
    isNavigatingRef.current = false; // Exit navigation mode on selection
    let newValue = suggestion.path;

    // For directories, add trailing slash to continue navigation
    const isDir = suggestion.isDirectory;
    if (isDir && !newValue.endsWith('/')) {
      newValue += '/';
    }

    onChange(newValue);
    setSelectedIndex(-1);

    // Always close dropdown on explicit selection (click or Enter)
    // User clicking/pressing Enter is confirmation they're happy with the selection
    setShowSuggestions(false);
    setSuggestions([]);

    // For directories, pre-fetch suggestions so they're ready when user types more
    // But don't show them immediately - wait for user to type
    if (isDir) {
      fetchSuggestions(newValue, false);
    }

    // Input should maintain focus - it never lost it because we use mousedown prevention
  };

  // Handle suggestion click - use mousedown to prevent focus loss
  const handleSuggestionMouseDown = (e: React.MouseEvent, suggestion: PathSuggestion) => {
    e.preventDefault(); // Prevents input from losing focus
    selectSuggestion(suggestion);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isNavigatingRef.current = false; // User is typing, exit navigation mode
    onChange(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    shouldMaintainFocusRef.current = true;
    // Show suggestions if we have them and there's content
    if (suggestions.length > 0 && value.length >= 1) {
      setShowSuggestions(true);
    }
    // Trigger fetch if we have a value but no suggestions yet
    if (value.length >= 1 && suggestions.length === 0) {
      fetchSuggestions(value);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to something within our component
    const relatedTarget = e.relatedTarget as Node | null;
    const isInternalFocusChange =
      suggestionsRef.current?.contains(relatedTarget) ||
      inputRef.current?.contains(relatedTarget);

    if (!isInternalFocusChange) {
      shouldMaintainFocusRef.current = false;
    }
    // Don't hide suggestions immediately - let mousedown handler work first
    // The click-outside handler will close it if needed
  };

  const Icon = mode === 'file' ? File : Folder;

  return (
    <div>
      {/* Input container with dropdown */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className={cn(
            "pr-10",
            error && "border-destructive",
            className
          )}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Icon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Suggestions dropdown - positioned relative to input */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
            role="listbox"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.path}
                role="option"
                aria-selected={selectedIndex === index}
                onMouseDown={(e) => handleSuggestionMouseDown(e, suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-center gap-2 cursor-pointer select-none",
                  selectedIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                {suggestion.isDirectory ? (
                  <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                ) : (
                  <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-1 truncate text-sm font-mono">
                  {highlightMatch(suggestion.path, value)}
                </span>
                {suggestion.isDirectory && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

// Find common prefix among paths (for shell-like tab completion)
function findCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';
  if (paths.length === 1) return paths[0] ?? '';

  let prefix = paths[0] ?? '';
  for (let i = 1; i < paths.length; i++) {
    const p = paths[i] ?? '';
    while (!p.startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

// Highlight the matching portion of the path
function highlightMatch(path: string, query: string): React.ReactNode {
  if (!query) return path;

  // For project-scoped paths, the query might be a partial path
  // Find where the current search term starts in the path
  const queryParts = query.split('/');
  const lastPart = (queryParts[queryParts.length - 1] ?? '').toLowerCase();

  if (!lastPart) return path;

  const lastSlashIndex = path.lastIndexOf('/');
  const fileName = lastSlashIndex >= 0 ? path.slice(lastSlashIndex + 1) : path;
  const fileNameLower = fileName.toLowerCase();

  const matchIndex = fileNameLower.indexOf(lastPart);

  if (matchIndex === -1) return path;

  const absoluteMatchStart = lastSlashIndex >= 0 ? lastSlashIndex + 1 + matchIndex : matchIndex;
  const absoluteMatchEnd = absoluteMatchStart + lastPart.length;

  return (
    <>
      {path.slice(0, absoluteMatchStart)}
      <span className="font-semibold text-foreground">
        {path.slice(absoluteMatchStart, absoluteMatchEnd)}
      </span>
      {path.slice(absoluteMatchEnd)}
    </>
  );
}
