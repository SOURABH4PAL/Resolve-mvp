import React from 'react';

export interface EmployeeNameProps {
  name?: string | null;
  email?: string | null;
  employeeId?: string | null;
  maxWidth?: string | number;
  showSubtitle?: boolean;
  showEmailSubtitle?: boolean;
}

export const EmployeeName: React.FC<EmployeeNameProps> = ({
  name,
  email,
  employeeId,
  maxWidth = '180px',
  showSubtitle = true,
  showEmailSubtitle,
}) => {
  const shouldShowSubtitle = showEmailSubtitle !== undefined ? showEmailSubtitle : showSubtitle;
  const displayName = name || 'Unassigned';
  const widthStyle = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', maxWidth: widthStyle, minWidth: 0 }}>
      <span
        style={{
          fontWeight: 600,
          color: 'var(--color-slate-900)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
        }}
        title={displayName}
      >
        {displayName}
      </span>
      {shouldShowSubtitle && (email || employeeId) && (
        <span
          style={{
            fontSize: '0.725rem',
            color: 'var(--color-slate-500)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            marginTop: 1,
          }}
          title={email || employeeId || ''}
        >
          {employeeId ? `${employeeId} ` : ''}{email ? `• ${email}` : ''}
        </span>
      )}
    </div>
  );
};
