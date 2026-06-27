"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MAP } from "@/types/map";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileCode2, ShieldAlert } from "lucide-react";

export default function ITMapsPage() {
  const [maps, setMaps] = useState<MAP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMaps() {
      try {
        const res = await api.get("/api/v1/maps");
        const allMaps: MAP[] = res.data;
        const itMaps = allMaps.filter((m: MAP) => m.department === "IT");
        setMaps(itMaps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMaps();
  }, []);

  if (loading) return <div className="p-8">Loading IT Remediation Tasks...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-3 mb-8">
        <FileCode2 className="w-8 h-8 text-primary-600" />
        <h1 className="text-3xl font-heading font-bold text-primary-900">
          RemediationForge Tasks
        </h1>
      </div>
      
      <p className="text-neutral-600 mb-6">
        Below are auto-generated remediation payloads for IT compliance tasks. 
        <span className="font-semibold text-danger-600 ml-2">All payloads require manual review before execution.</span>
      </p>

      {maps.length === 0 ? (
        <Card className="text-center text-neutral-500">
          No IT remediation tasks found.
        </Card>
      ) : (
        <div className="grid gap-4">
          {maps.map((map) => (
            <Link key={map.id} href={`/it/maps/${map.id}`}>
              <Card className="hover:border-primary-400 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-primary-500 bg-primary-50 px-2 py-1 rounded">
                        {map.id}
                      </span>
                      {map.remediation_payload ? (
                        <Badge variant="warning">Payload Ready</Badge>
                      ) : (
                        <Badge variant="neutral">Pending Generation</Badge>
                      )}
                      {map.remediation_approved && (
                        <Badge variant="success">Approved</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900">{map.title}</h3>
                    <p className="text-sm text-neutral-600 line-clamp-1">{map.description}</p>
                  </div>
                  {map.remediation_payload && (
                    <div className="flex flex-col items-end space-y-1">
                      <span className="text-xs text-neutral-500 uppercase font-semibold">Risk Level</span>
                      <div className="flex items-center space-x-1">
                        {map.remediation_payload.risk_level === "HIGH" && <ShieldAlert className="w-4 h-4 text-danger-500" />}
                        <span className={`text-sm font-semibold ${
                          map.remediation_payload.risk_level === 'HIGH' ? 'text-danger-600' :
                          map.remediation_payload.risk_level === 'MEDIUM' ? 'text-warning-600' : 'text-success-600'
                        }`}>
                          {map.remediation_payload.risk_level}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
