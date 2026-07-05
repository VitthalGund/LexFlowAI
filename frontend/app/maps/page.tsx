'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { MAPStatusBadge } from '@/components/maps/MAPStatusBadge';
import { 
  ListTodo, 
  Building, 
  Calendar, 
  CheckSquare, 
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface MAPItem {
  id: string;
  circular_id: string;
  title: string;
  description: string;
  kpi: string;
  deadline_days: number;
  deadline: string;
  department: string;
  evidence_type: string;
  geographic_scope: string;
  target_lgd_codes: string[];
  status: string;
  is_anticipatory?: boolean;
}

export default function MapsPage() {
  const [maps, setMaps] = useState<MAPItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMaps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/maps');
      setMaps(res.data);
    } catch (err) {
      console.error('Failed to retrieve MAP tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchMaps();
    });
  }, []);

  const departments = ['ALL', 'IT', 'OPERATIONS', 'RISK', 'HR', 'FINANCE', 'AUDIT'];
  const statuses = ['ALL', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'QUARANTINED', 'OVERDUE'];

  // Client-side filtering for search & options
  const filteredMaps = maps.filter(item => {
    const matchesDept = selectedDept === 'ALL' || item.department.toUpperCase() === selectedDept;
    const matchesStatus = selectedStatus === 'ALL' || item.status.toUpperCase() === selectedStatus;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Regulatory Action Points Ledger</h2>
          <p className="text-xs text-slate-500 mt-1">
            Tracking individual Measurable Action Points (MAPs) across all active banking nodes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold bg-neutral-50 px-3.5 py-2 border border-neutral-200 rounded text-slate-600">
          <CheckSquare className="h-4.5 w-4.5 text-primary-500" />
          <span>Total: {maps.length} MAP items</span>
        </div>
      </div>

      {/* Filter Options */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description, or MAP ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-500 rounded px-3 py-2 pl-10 text-xs outline-none transition-colors"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded p-2 text-slate-600 outline-none w-full md:w-auto"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>Dept: {dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded p-2 text-slate-600 outline-none w-full md:w-auto"
            >
              {statuses.map((st) => (
                <option key={st} value={st}>Status: {st.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

        </div>
      </Card>

      {/* MAPs Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredMaps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMaps.map((item) => (
            <Card 
              key={item.id} 
              className={`hover:border-primary-400 flex flex-col justify-between h-full relative ${
                item.is_anticipatory ? 'border-dashed border-2 border-amber-300' : ''
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <span>{item.title}</span>
                      {item.is_anticipatory && (
                        <span className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded tracking-wide uppercase shrink-0">
                          Anticipatory
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{item.id}</span>
                  </div>
                  <MAPStatusBadge status={item.status} />
                </div>

                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {item.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-[11px] pt-2">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[8px]">Department</span>
                    <span className="text-slate-600 font-semibold mt-0.5 block">{item.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[8px]">Evidence Format</span>
                    <span className="text-slate-600 font-semibold mt-0.5 block">{item.evidence_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[8px]">Geographic Scope</span>
                    <span className="text-slate-600 font-semibold mt-0.5 block flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      {item.geographic_scope} ({item.target_lgd_codes.length} branches)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[8px]">Action Deadline</span>
                    <span className="text-slate-600 font-semibold mt-0.5 block flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {item.deadline_days} days
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-6 flex justify-end">
                <Link
                  href={`/maps/${item.id}`}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span>Inspection Board</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-lg text-slate-400">
          <ListTodo className="h-12 w-12 mx-auto text-slate-300 stroke-[1.5] mb-2" />
          <p className="text-xs font-semibold">No MAP items matched your filters.</p>
        </div>
      )}
    </div>
  );
}
