import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, X, Clock, Users, DollarSign, Package, 
  Target, FileText, Loader2, ArrowRight 
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

// Search configuration for different entities
const SEARCH_CONFIG = {
  User: {
    label: 'Employees',
    icon: Users,
    color: 'bg-blue-500',
    searchFields: ['full_name', 'email', 'designation', 'department'],
    displayFields: ['full_name', 'designation', 'department'],
    linkPath: '/employees'
  },
  Lead: {
    label: 'Leads',
    icon: Target,
    color: 'bg-purple-500',
    searchFields: ['student_name', 'phone', 'email', 'course_interest'],
    displayFields: ['student_name', 'phone', 'lead_status', 'course_interest'],
    linkPath: '/crm'
  },
  Admission: {
    label: 'Admissions',
    icon: Users,
    color: 'bg-green-500',
    searchFields: ['student_name', 'student_phone', 'course_name', 'course_type'],
    displayFields: ['student_name', 'course_name', 'admission_status'],
    linkPath: '/admissions'
  },
  Expense: {
    label: 'Expenses',
    icon: DollarSign,
    color: 'bg-red-500',
    searchFields: ['expense_title', 'category', 'submitted_by_name', 'vendor_name'],
    displayFields: ['expense_title', 'amount', 'status', 'category'],
    linkPath: '/expenses'
  },
  Income: {
    label: 'Income',
    icon: DollarSign,
    color: 'bg-emerald-500',
    searchFields: ['income_title', 'student_name', 'responsible_employee'],
    displayFields: ['income_title', 'amount', 'status', 'revenue_stream'],
    linkPath: '/income'
  },
  Inventory: {
    label: 'Inventory',
    icon: Package,
    color: 'bg-orange-500',
    searchFields: ['item_name', 'category', 'supplier_name'],
    displayFields: ['item_name', 'category', 'current_stock', 'status'],
    linkPath: '/inventory'
  }
};

export const UniversalSearch = ({ entities, className = "" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('biddabari_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch(searchTerm.trim());
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (query) => {
    setLoading(true);
    const searchResults = [];

    try {
      // Search across all configured entities
      const searchPromises = Object.entries(SEARCH_CONFIG).map(async ([entityName, config]) => {
        if (!entities[entityName]) return [];

        try {
          // Simple text search - in production, you might want more sophisticated search
          const entityResults = await entities[entityName].list('-created_date', 20);
          
          // Filter results based on search fields
          const filtered = entityResults.filter(item => {
            return config.searchFields.some(field => {
              const value = item[field];
              return value && 
                     typeof value === 'string' && 
                     value.toLowerCase().includes(query.toLowerCase());
            });
          });

          return filtered.slice(0, 5).map(item => ({
            ...item,
            _entityType: entityName,
            _config: config
          }));
        } catch (error) {
          console.error(`Search error for ${entityName}:`, error);
          return [];
        }
      });

      const allResults = await Promise.all(searchPromises);
      const flattened = allResults.flat();
      
      // Sort by relevance (simple scoring based on match position)
      flattened.sort((a, b) => {
        const aScore = getRelevanceScore(a, query);
        const bScore = getRelevanceScore(b, query);
        return bScore - aScore;
      });

      setResults(flattened.slice(0, 15)); // Limit total results
      setShowResults(true);

    } catch (error) {
      console.error('Universal search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getRelevanceScore = (item, query) => {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    
    item._config.searchFields.forEach((field, index) => {
      const value = item[field];
      if (value && typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes(lowerQuery)) {
          // Higher score for earlier match and more important fields
          const position = lowerValue.indexOf(lowerQuery);
          score += (100 - position) * (item._config.searchFields.length - index);
        }
      }
    });
    
    return score;
  };

  const saveRecentSearch = (query) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('biddabari_recent_searches', JSON.stringify(updated));
  };

  const handleResultClick = (result) => {
    const query = searchTerm.trim();
    if (query) {
      saveRecentSearch(query);
    }
    setShowResults(false);
    setSearchTerm('');
  };

  const clearSearch = () => {
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
  };

  const ResultItem = ({ result }) => {
    const config = result._config;
    const Icon = config.icon;
    
    return (
      <Link
        to={createPageUrl(config.linkPath.slice(1))}
        onClick={() => handleResultClick(result)}
        className="block p-3 hover:bg-muted/50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm truncate">
                {result[config.displayFields[0]] || 'N/A'}
              </p>
              <Badge variant="secondary" className="text-xs">
                {config.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {config.displayFields.slice(1, 3).map(field => {
                const value = result[field];
                if (!value) return null;
                
                return (
                  <span key={field} className="truncate">
                    {typeof value === 'number' && field.includes('amount') 
                      ? `৳${value.toLocaleString()}`
                      : value
                    }
                  </span>
                );
              })}
            </div>
          </div>
          
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Link>
    );
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search across all modules..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="pl-9 pr-10 bg-background/80 backdrop-blur-sm border-border/50"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <Card 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto"
        >
          <CardContent className="p-2">
            {searchTerm.trim().length < 2 && recentSearches.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  Recent Searches
                </p>
                <div className="flex flex-wrap gap-1">
                  {recentSearches.map((recent, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm(recent)}
                      className="text-xs h-6 px-2"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {recent}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {searchTerm.trim().length >= 2 && (
              <>
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!loading && results.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No results found for "{searchTerm}"</p>
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <ResultItem key={`${result._entityType}-${result.id}-${index}`} result={result} />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UniversalSearch;