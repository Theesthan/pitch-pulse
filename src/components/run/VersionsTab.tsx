import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Lock, 
  RotateCcw, 
  GitCompare,
  ChevronDown,
  ChevronUp,
  User,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { RunVersion, useVersions, useRestoreVersion } from '@/hooks/useVersions';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VersionsTabProps {
  runId: string;
  runStatus: string;
  onVersionSelect?: (version: RunVersion) => void;
}

export function VersionsTab({ runId, runStatus, onVersionSelect }: VersionsTabProps) {
  const { data: versions, isLoading } = useVersions(runId);
  const restoreVersion = useRestoreVersion();
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const toggleExpand = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const handleCompareToggle = (versionId: string) => {
    if (selectedForCompare.includes(versionId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== versionId));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, versionId]);
    }
  };

  const handleRestore = (version: RunVersion) => {
    restoreVersion.mutate({ version });
  };

  const canModify = runStatus === 'draft';

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!versions?.length) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>Track changes and compare versions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No versions yet</h3>
            <p className="mt-1 text-muted-foreground">
              Save your work to create the first version
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Version History</CardTitle>
            <CardDescription>
              {versions.length} version{versions.length !== 1 ? 's' : ''} saved
            </CardDescription>
          </div>
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedForCompare([]);
            }}
          >
            <GitCompare className="mr-2 h-4 w-4" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {compareMode && (
          <div className="mb-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              Select 2 versions to compare. Selected: {selectedForCompare.length}/2
            </p>
            {selectedForCompare.length === 2 && (
              <VersionCompare 
                versions={versions} 
                selectedIds={selectedForCompare} 
              />
            )}
          </div>
        )}

        <div className="space-y-3">
          {versions.map((version, index) => (
            <Collapsible
              key={version.id}
              open={expandedVersions.has(version.id)}
              onOpenChange={() => toggleExpand(version.id)}
            >
              <div className={`rounded-lg border p-4 transition-colors ${
                compareMode && selectedForCompare.includes(version.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {compareMode && (
                      <input
                        type="checkbox"
                        checked={selectedForCompare.includes(version.id)}
                        onChange={() => handleCompareToggle(version.id)}
                        disabled={selectedForCompare.length >= 2 && !selectedForCompare.includes(version.id)}
                        className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Version {version.version_number}</span>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-xs">Latest</Badge>
                        )}
                        {version.is_locked && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="mr-1 h-3 w-3" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                        {version.creator_profile && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {version.creator_profile.full_name || version.creator_profile.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!compareMode && canModify && !version.is_locked && index !== 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore Version {version.version_number}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will create a new version with the content from Version {version.version_number}. 
                              Your current work will not be lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRestore(version)}>
                              Restore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {expandedVersions.has(version.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent className="pt-4">
                  <VersionDetails version={version} />
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VersionDetails({ version }: { version: RunVersion }) {
  return (
    <div className="space-y-4 border-t pt-4">
      {version.kpis && Object.keys(version.kpis).length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">KPIs</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {Object.entries(version.kpis).map(([key, value]) => (
              <div key={key} className="rounded bg-muted/50 p-2">
                <span className="text-xs text-muted-foreground">{key}</span>
                <p className="font-mono text-sm">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {version.pitchbook_content && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Pitchbook Content</h4>
          <div className="space-y-2 text-sm">
            {version.pitchbook_content.companyOverview && (
              <div className="rounded bg-muted/50 p-2">
                <span className="text-xs text-muted-foreground">Company Overview</span>
                <p className="mt-1 line-clamp-2">{version.pitchbook_content.companyOverview}</p>
              </div>
            )}
            {version.pitchbook_content.investmentHighlights && (
              <div className="rounded bg-muted/50 p-2">
                <span className="text-xs text-muted-foreground">Investment Highlights</span>
                <p className="mt-1 line-clamp-2">{version.pitchbook_content.investmentHighlights}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {version.credit_memo_content && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Credit Memo Content</h4>
          <div className="space-y-2 text-sm">
            {version.credit_memo_content.summary && (
              <div className="rounded bg-muted/50 p-2">
                <span className="text-xs text-muted-foreground">Summary</span>
                <p className="mt-1 line-clamp-2">{version.credit_memo_content.summary}</p>
              </div>
            )}
            {version.credit_memo_content.recommendation && (
              <div className="rounded bg-muted/50 p-2">
                <span className="text-xs text-muted-foreground">Recommendation</span>
                <p className="mt-1 line-clamp-2">{version.credit_memo_content.recommendation}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VersionCompare({ versions, selectedIds }: { versions: RunVersion[]; selectedIds: string[] }) {
  const [v1, v2] = selectedIds.map(id => versions.find(v => v.id === id)!);
  
  if (!v1 || !v2) return null;

  const older = v1.version_number < v2.version_number ? v1 : v2;
  const newer = v1.version_number < v2.version_number ? v2 : v1;

  const kpiChanges = compareKpis(older.kpis, newer.kpis);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>Version {older.version_number}</span>
        <span className="text-muted-foreground">→</span>
        <span>Version {newer.version_number}</span>
      </div>
      
      {kpiChanges.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">KPI Changes</h4>
          <div className="space-y-1">
            {kpiChanges.map(change => (
              <div key={change.key} className="flex items-center justify-between rounded bg-background p-2 text-sm">
                <span>{change.key}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{change.oldValue ?? 'N/A'}</span>
                  <span>→</span>
                  <span className={change.type === 'added' ? 'text-green-500' : change.type === 'removed' ? 'text-red-500' : 'text-yellow-500'}>
                    {change.newValue ?? 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function compareKpis(
  oldKpis: Record<string, number | string | null> | null,
  newKpis: Record<string, number | string | null> | null
) {
  const changes: { key: string; oldValue: number | string | null; newValue: number | string | null; type: 'added' | 'removed' | 'changed' }[] = [];
  
  const oldKeys = new Set(Object.keys(oldKpis || {}));
  const newKeys = new Set(Object.keys(newKpis || {}));
  
  // Added keys
  for (const key of newKeys) {
    if (!oldKeys.has(key)) {
      changes.push({ key, oldValue: null, newValue: newKpis?.[key] ?? null, type: 'added' });
    }
  }
  
  // Removed keys
  for (const key of oldKeys) {
    if (!newKeys.has(key)) {
      changes.push({ key, oldValue: oldKpis?.[key] ?? null, newValue: null, type: 'removed' });
    }
  }
  
  // Changed keys
  for (const key of oldKeys) {
    if (newKeys.has(key) && oldKpis?.[key] !== newKpis?.[key]) {
      changes.push({ key, oldValue: oldKpis?.[key] ?? null, newValue: newKpis?.[key] ?? null, type: 'changed' });
    }
  }
  
  return changes;
}
