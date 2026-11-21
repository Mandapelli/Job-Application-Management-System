import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  EMPLOYMENT_LABELS,
  EMPLOYMENT_TYPES,
  STATUSES,
  STATUS_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type ListParams,
} from '../types';

// Radix Select cannot use an empty string as a value, so "no filter" is this sentinel.
const ALL = 'ALL';

export const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest added' },
  { value: 'createdAt:asc', label: 'Oldest added' },
  { value: 'appliedDate:desc', label: 'Applied date (newest)' },
  { value: 'appliedDate:asc', label: 'Applied date (oldest)' },
] as const;

interface Props {
  params: ListParams;
  searchText: string;
  locationText: string;
  hasFilters: boolean;
  /** The board already has one column per status, so the status filter is hidden there. */
  hideStatus?: boolean;
  onSearchTextChange: (v: string) => void;
  onLocationTextChange: (v: string) => void;
  onChange: (changes: Record<string, string | undefined>) => void;
  onClear: () => void;
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  options,
  label,
}: {
  value: string | undefined;
  onValueChange: (v: string | undefined) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onValueChange(v === ALL ? undefined : v)}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ApplicationFilters({
  params,
  searchText,
  locationText,
  hasFilters,
  hideStatus,
  onSearchTextChange,
  onLocationTextChange,
  onChange,
  onClear,
}: Props) {
  return (
    <div className="space-y-3 border-b p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search company or job title"
            aria-label="Search company or job title"
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
          />
        </div>
        <Input
          placeholder="Filter by location"
          aria-label="Filter by location"
          value={locationText}
          onChange={(e) => onLocationTextChange(e.target.value)}
        />
        <FilterSelect
          label="Sort by"
          value={`${params.sortBy}:${params.sortOrder}`}
          placeholder="Sort"
          options={SORT_OPTIONS.map((o) => ({ ...o }))}
          onValueChange={(v) => {
            const [sortBy, sortOrder] = (v ?? 'createdAt:desc').split(':');
            onChange({ sortBy, sortOrder });
          }}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {!hideStatus && (
          <FilterSelect
            label="Status"
            value={params.status}
            placeholder="All statuses"
            options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            onValueChange={(v) => onChange({ status: v })}
          />
        )}
        <FilterSelect
          label="Work mode"
          value={params.workMode}
          placeholder="All work modes"
          options={WORK_MODES.map((m) => ({ value: m, label: WORK_MODE_LABELS[m] }))}
          onValueChange={(v) => onChange({ workMode: v })}
        />
        <FilterSelect
          label="Employment type"
          value={params.employmentType}
          placeholder="All employment types"
          options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: EMPLOYMENT_LABELS[t] }))}
          onValueChange={(v) => onChange({ employmentType: v })}
        />
        {hasFilters && (
          <Button variant="ghost" onClick={onClear} className="justify-self-start">
            <X className="h-4 w-4" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
