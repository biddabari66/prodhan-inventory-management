
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label'; // New import for Label

export default function CRMFilters({ filters, onFilterChange }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-white rounded-lg border">
            {/* Status Filter */}
            <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Status</Label>
                <Select value={filters.status || 'all'} onValueChange={(value) => onFilterChange({ status: value })}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Department Filter - NEW */}
            <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Department</Label>
                <Select value={filters.department || 'all'} onValueChange={(value) => onFilterChange({ department: value })}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="biddabari">Biddabari</SelectItem>
                        <SelectItem value="boibari">Boibari</SelectItem>
                        <SelectItem value="prodhan_com_e_commerce">Prodhan.com</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Source</Label>
                <Select value={filters.source || 'all'} onValueChange={(value) => onFilterChange({ source: value })}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="facebook_ads">Facebook Ads</SelectItem>
                        <SelectItem value="google_ads">Google Ads</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Lead Score Filter */}
            <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Lead Score</Label>
                <Select value={filters.leadScore || 'all'} onValueChange={(value) => onFilterChange({ leadScore: value })}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Scores</SelectItem>
                        <SelectItem value="high">High (80-100)</SelectItem>
                        <SelectItem value="medium">Medium (50-79)</SelectItem>
                        <SelectItem value="low">Low (0-49)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Date Range</Label>
                <Select value={filters.dateRange || 'all'} onValueChange={(value) => onFilterChange({ dateRange: value })}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Assigned Filter */}
            <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Assignment</Label>
                <Select value={filters.assigned || 'all'} onValueChange={(value) => onFilterChange({ assigned: value })}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Leads</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="mine">My Leads</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
