// components/ui/DashboardSkeleton.tsx
import React from 'react';

const DashboardSkeleton = () => {
  return (
    <div style={styles.container}>
      {/* Header Skeleton */}
      <div style={styles.header}>
        <div style={styles.headerSkeleton}>
          <div style={styles.titleSkeleton} />
          <div style={styles.subtitleSkeleton} />
        </div>
        <div style={styles.headerActionsSkeleton}>
          <div style={styles.refreshButtonSkeleton} />
          <div style={styles.lastUpdatedSkeleton} />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div style={styles.statsGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={styles.statCardSkeleton}>
            <div style={styles.statCardHeaderSkeleton}>
              <div style={styles.statIconSkeleton} />
              <div style={styles.trendBadgeSkeleton} />
            </div>
            <div style={styles.statValueSkeleton} />
            <div style={styles.statTitleSkeleton} />
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div style={styles.section}>
        <div style={styles.sectionHeaderSkeleton}>
          <div style={styles.sectionTitleSkeleton} />
          <div style={styles.sectionSubtitleSkeleton} />
        </div>
        
        <div style={styles.actionsGridSkeleton}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={styles.actionCardSkeleton}>
              <div style={styles.actionCardHeaderSkeleton}>
                <div style={styles.actionIconSkeleton} />
                <div style={styles.actionBadgeSkeleton} />
              </div>
              <div style={styles.actionTitleSkeleton} />
              <div style={styles.actionDescriptionSkeleton} />
              <div style={styles.actionFooterSkeleton}>
                <div style={styles.actionLinkSkeleton} />
                <div style={styles.arrowSkeleton} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Skeleton (Optional) */}
      <div style={styles.section}>
        <div style={styles.sectionHeaderSkeleton}>
          <div style={styles.sectionTitleSkeleton} />
          <div style={styles.sectionSubtitleSkeleton} />
        </div>
        
        <div style={styles.tableSkeleton}>
          <div style={styles.tableHeaderSkeleton}>
            {['User', 'Service', 'Date', 'Status'].map((col, i) => (
              <div key={i} style={styles.tableHeaderCellSkeleton}>
                {col}
              </div>
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} style={styles.tableRowSkeleton}>
              <div style={styles.tableCellSkeleton}>
                <div style={styles.userCellSkeleton}>
                  <div style={styles.avatarSkeleton} />
                  <div style={styles.userInfoSkeleton}>
                    <div style={styles.userNameSkeleton} />
                    <div style={styles.userEmailSkeleton} />
                  </div>
                </div>
              </div>
              <div style={styles.tableCellSkeleton}>
                <div style={styles.serviceNameSkeleton} />
              </div>
              <div style={styles.tableCellSkeleton}>
                <div style={styles.dateSkeleton} />
              </div>
              <div style={styles.tableCellSkeleton}>
                <div style={styles.statusSkeleton} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '2rem',
  },
  
  // Header Skeleton
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  
  headerSkeleton: {
    flex: 1,
  },
  
  titleSkeleton: {
    width: '200px',
    height: '36px',
    backgroundColor: '#E5E7EB',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  
  subtitleSkeleton: {
    width: '300px',
    height: '20px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
  },
  
  headerActionsSkeleton: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  
  refreshButtonSkeleton: {
    width: '100px',
    height: '40px',
    backgroundColor: '#E5E7EB',
    borderRadius: '8px',
  },
  
  lastUpdatedSkeleton: {
    width: '120px',
    height: '16px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
  },
  
  // Stats Grid Skeleton
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  
  statCardSkeleton: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #F3F4F6',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
  },
  
  statCardHeaderSkeleton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  
  statIconSkeleton: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: '#E5E7EB',
  },
  
  trendBadgeSkeleton: {
    width: '60px',
    height: '32px',
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
  },
  
  statValueSkeleton: {
    width: '120px',
    height: '36px',
    backgroundColor: '#E5E7EB',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  
  statTitleSkeleton: {
    width: '80px',
    height: '20px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
  },
  
  // Section Skeleton
  section: {
    marginBottom: '40px',
  },
  
  sectionHeaderSkeleton: {
    marginBottom: '20px',
  },
  
  sectionTitleSkeleton: {
    width: '150px',
    height: '28px',
    backgroundColor: '#E5E7EB',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  
  sectionSubtitleSkeleton: {
    width: '250px',
    height: '20px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
  },
  
  // Actions Grid Skeleton
  actionsGridSkeleton: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  
  actionCardSkeleton: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #F3F4F6',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
  },
  
  actionCardHeaderSkeleton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  
  actionIconSkeleton: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: '#E5E7EB',
  },
  
  actionBadgeSkeleton: {
    width: '50px',
    height: '24px',
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
  },
  
  actionTitleSkeleton: {
    width: '100px',
    height: '24px',
    backgroundColor: '#E5E7EB',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  
  actionDescriptionSkeleton: {
    width: '100%',
    height: '40px',
    backgroundColor: '#F3F4F6',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  
  actionFooterSkeleton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #F3F4F6',
  },
  
  actionLinkSkeleton: {
    width: '60px',
    height: '20px',
    backgroundColor: '#E5E7EB',
    borderRadius: '6px',
  },
  
  arrowSkeleton: {
    width: '20px',
    height: '20px',
    backgroundColor: '#F3F4F6',
    borderRadius: '4px',
  },
  
  // Table Skeleton
  tableSkeleton: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #F3F4F6',
    overflow: 'hidden',
  },
  
  tableHeaderSkeleton: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '16px 24px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #F3F4F6',
  },
  
  tableHeaderCellSkeleton: {
    color: '#6B7280',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  
  tableRowSkeleton: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '20px 24px',
    borderBottom: '1px solid #F3F4F6',
    alignItems: 'center',
  },
  
  tableCellSkeleton: {
    padding: '0 8px',
  },
  
  userCellSkeleton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  avatarSkeleton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#E5E7EB',
  },
  
  userInfoSkeleton: {
    flex: 1,
  },
  
  userNameSkeleton: {
    width: '120px',
    height: '16px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  
  userEmailSkeleton: {
    width: '160px',
    height: '14px',
    backgroundColor: '#F3F4F6',
    borderRadius: '4px',
  },
  
  serviceNameSkeleton: {
    width: '100px',
    height: '20px',
    backgroundColor: '#E5E7EB',
    borderRadius: '6px',
  },
  
  dateSkeleton: {
    width: '80px',
    height: '20px',
    backgroundColor: '#E5E7EB',
    borderRadius: '6px',
  },
  
  statusSkeleton: {
    width: '60px',
    height: '24px',
    backgroundColor: '#F3F4F6',
    borderRadius: '12px',
  },
};

export default DashboardSkeleton;