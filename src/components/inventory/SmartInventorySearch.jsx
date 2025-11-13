import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Clock, TrendingUp, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDebounce } from '../common/PerformanceOptimizer';

/**
 * 🤖 SMART INVENTORY SEARCH WITH AI SUGGESTIONS
 * Learns from user behavior and provides intelligent suggestions
 */

export default function SmartInventorySearch({ 
  value, 
  onChange, 
  onSearch, 
  currentUser,
  placeholder = "Search inventory..." 
}) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedSearch = useDebounce((term) => {
    if (onSearch) {
      onSearch(term);
    }
  }, 300);

  const loadSuggestions = async (term) => {
    if (!currentUser) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await base44.functions.invoke('getInventorySearchSuggestions', {
        search_term: term,
        limit: 8
      });

      if (response.data.success) {
        setSuggestions(response.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const debouncedLoadSuggestions = useDebounce(loadSuggestions, 500);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      debouncedLoadSuggestions(searchTerm);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    debouncedSearch(newValue);
  };

  const handleSuggestionClick = async (suggestion) => {
    const searchValue = suggestion.label;
    setSearchTerm(searchValue);
    onChange(searchValue);
    setShowSuggestions(false);
    
    if (onSearch) {
      onSearch(searchValue);
    }

    // Log the interaction for future learning
    if (currentUser && suggestion.item_id) {
      try {
        await base44.entities.UserInventoryInteraction.create({
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          search_term: searchValue,
          item_id: suggestion.item_id,
          item_name: suggestion.label,
          interaction_type: 'search',
          department: currentUser.department,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to log interaction:', error);
      }
    }
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'recent': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'popular': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'ai_related': return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'low_stock': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      default: return <Search className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSuggestionColor = (type) => {
    switch (type) {
      case 'recent': return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
      case 'popular': return 'bg-green-50 hover:bg-green-100 border-green-200';
      case 'ai_related': return 'bg-purple-50 hover:bg-purple-100 border-purple-200';
      case 'low_stock': return 'bg-orange-50 hover:bg-orange-100 border-orange-200';
      default: return 'bg-gray-50 hover:bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          value={searchTerm}
          onChange={handleChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            } else if (searchTerm.length >= 2) {
              loadSuggestions(searchTerm);
            }
          }}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base"
        />
        {isLoadingSuggestions && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-violet-500 animate-spin" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowSuggestions(false)}
          />
          
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-800">
                  AI-Powered Suggestions
                </span>
              </div>
            </div>
            
            <ScrollArea className="max-h-80">
              <div className="p-2 space-y-1">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${getSuggestionColor(suggestion.type)}`}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {suggestion.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.subtitle}
                      </p>
                    </div>
                    {suggestion.stock !== undefined && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        Stock: {suggestion.stock}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}