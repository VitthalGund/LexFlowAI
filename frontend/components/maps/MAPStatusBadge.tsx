import React from 'react';
import { Badge } from '../ui/Badge';

interface MAPStatusBadgeProps {
  status: string;
  className?: string;
}

export function MAPStatusBadge({ status, className = '' }: MAPStatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();

  const getVariant = () => {
    switch (normalizedStatus) {
      case 'VERIFIED':
      case 'ACCEPTED':
        return 'success';
      case 'IN_PROGRESS':
        return 'primary';
      case 'SUBMITTED':
      case 'PENDING_REVIEW':
        return 'warning';
      case 'QUARANTINED':
        return 'danger';
      case 'OVERDUE':
        return 'overdue';
      case 'PENDING':
      default:
        return 'neutral';
    }
  };

  const getLabel = () => {
    switch (normalizedStatus) {
      case 'VERIFIED':
      case 'ACCEPTED':
        return 'VERIFIED';
      case 'IN_PROGRESS':
        return 'IN PROGRESS';
      case 'SUBMITTED':
        return 'SUBMITTED';
      case 'QUARANTINED':
        return 'QUARANTINED';
      case 'OVERDUE':
        return 'OVERDUE';
      case 'PENDING':
      default:
        return 'PENDING';
    }
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {getLabel()}
    </Badge>
  );
}
