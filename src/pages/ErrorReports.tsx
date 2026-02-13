import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { TerminalInput } from "@/components/ui/TerminalInput";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Bug, 
  CheckCircle, 
  Clock, 
  Eye, 
  EyeOff,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Search,
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  Copy,
  ExternalLink,
  Download
} from "lucide-react";
import { format, formatDistanceToNow, subDays, isAfter } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type ErrorStatus = 'new' | 'investigating' | 'fixed' | 'ignored';
type ErrorType = 'js_error' | 'promise_rejection' | 'react_boundary';

interface ErrorReport {
  id: string;
  error_message: string;
  stack_trace: string | null;
  component_stack: string | null;
  url: string | null;
  route: string | null;
  user_id: string | null;
  user_agent: string | null;
  error_type: string;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  occurrence_count: number;
  last_occurred_at: string;
  fingerprint: string;
}

const statusConfig: Record<ErrorStatus, { icon: React.ComponentType<{ className?: string }>, label: string, color: string }> = {
  new: { icon: AlertTriangle, label: 'New', color: 'bg-destructive text-destructive-foreground' },
  investigating: { icon: Clock, label: 'Investigating', color: 'bg-yellow-500 text-black' },
  fixed: { icon: CheckCircle, label: 'Fixed', color: 'bg-primary text-primary-foreground' },
  ignored: { icon: EyeOff, label: 'Ignored', color: 'bg-muted text-muted-foreground' },
};

const errorTypeLabels: Record<ErrorType, string> = {
  js_error: 'JavaScript Error',
  promise_rejection: 'Promise Rejection',
  react_boundary: 'React Crash',
};

export default function ErrorReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('errors');
  
  // Check if user is admin
  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['user-is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !!data;
    },
    enabled: !!user?.id,
  });
  
  // Fetch all error reports for stats
  const { data: allErrors, isLoading, refetch } = useQuery({
    queryKey: ['error-reports-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as ErrorReport[];
    },
    enabled: isAdmin === true,
  });
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (!allErrors) return null;
    
    const now = new Date();
    const last24h = subDays(now, 1);
    const last7d = subDays(now, 7);
    
    const newCount = allErrors.filter(e => e.status === 'new').length;
    const investigatingCount = allErrors.filter(e => e.status === 'investigating').length;
    const fixedCount = allErrors.filter(e => e.status === 'fixed').length;
    const ignoredCount = allErrors.filter(e => e.status === 'ignored').length;
    
    const last24hErrors = allErrors.filter(e => isAfter(new Date(e.created_at), last24h));
    const last7dErrors = allErrors.filter(e => isAfter(new Date(e.created_at), last7d));
    
    const totalOccurrences = allErrors.reduce((sum, e) => sum + e.occurrence_count, 0);
    const uniqueUsers = new Set(allErrors.filter(e => e.user_id).map(e => e.user_id)).size;
    
    // Group by error type
    const byType = allErrors.reduce((acc, e) => {
      acc[e.error_type] = (acc[e.error_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by route
    const byRoute = allErrors.reduce((acc, e) => {
      const route = e.route || 'Unknown';
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Top errors by occurrence
    const topErrors = [...allErrors]
      .sort((a, b) => b.occurrence_count - a.occurrence_count)
      .slice(0, 5);
    
    return {
      total: allErrors.length,
      newCount,
      investigatingCount,
      fixedCount,
      ignoredCount,
      last24h: last24hErrors.length,
      last7d: last7dErrors.length,
      totalOccurrences,
      uniqueUsers,
      byType,
      byRoute,
      topErrors,
    };
  }, [allErrors]);
  
  // Filter errors
  const filteredErrors = useMemo(() => {
    if (!allErrors) return [];
    
    return allErrors.filter(error => {
      if (statusFilter !== 'all' && error.status !== statusFilter) return false;
      if (typeFilter !== 'all' && error.error_type !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          error.error_message.toLowerCase().includes(query) ||
          error.route?.toLowerCase().includes(query) ||
          error.url?.toLowerCase().includes(query) ||
          error.fingerprint.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [allErrors, statusFilter, typeFilter, searchQuery]);
  
  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ErrorStatus }) => {
      const { error } = await supabase
        .from('error_reports')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports-all'] });
      toast({ title: 'Status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    },
  });
  
  // Bulk update status mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: ErrorStatus }) => {
      const { error } = await supabase
        .from('error_reports')
        .update({ status })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports-all'] });
      setSelectedIds(new Set());
      toast({ title: `${selectedIds.size} reports updated` });
    },
    onError: () => {
      toast({ title: 'Failed to update', variant: 'destructive' });
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('error_reports')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports-all'] });
      setSelectedError(null);
      toast({ title: 'Error report deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    },
  });
  
  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('error_reports')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-reports-all'] });
      setSelectedIds(new Set());
      toast({ title: `${selectedIds.size} reports deleted` });
    },
    onError: () => {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    },
  });
  
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };
  
  const selectAll = () => {
    if (selectedIds.size === filteredErrors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredErrors.map(e => e.id)));
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };
  
  const exportErrors = () => {
    if (!filteredErrors.length) return;
    
    const csv = [
      ['ID', 'Status', 'Type', 'Message', 'Route', 'URL', 'Occurrences', 'First Occurred', 'Last Occurred', 'User ID'].join(','),
      ...filteredErrors.map(e => [
        e.id,
        e.status,
        e.error_type,
        `"${e.error_message.replace(/"/g, '""')}"`,
        e.route || '',
        e.url || '',
        e.occurrence_count,
        e.created_at,
        e.last_occurred_at,
        e.user_id || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return <Navigate to="/campaigns" replace />;
  }
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TerminalButton
              variant="ghost"
              size="icon"
              onClick={() => navigate('/campaigns')}
            >
              <ArrowLeft className="h-4 w-4" />
            </TerminalButton>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
                <Bug className="h-6 w-6" />
                Bug Tracker
              </h1>
              <p className="text-muted-foreground text-sm">
                Monitor and manage application errors
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TerminalButton onClick={exportErrors} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </TerminalButton>
            <TerminalButton onClick={() => refetch()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </TerminalButton>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="errors" className="gap-2">
              <Bug className="h-4 w-4" />
              Error Log
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="space-y-6 mt-6">
            {/* Summary Cards */}
            {stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <TerminalCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.newCount}</p>
                        <p className="text-sm text-muted-foreground">New Errors</p>
                      </div>
                    </div>
                  </TerminalCard>
                  
                  <TerminalCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <Clock className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.investigatingCount}</p>
                        <p className="text-sm text-muted-foreground">Investigating</p>
                      </div>
                    </div>
                  </TerminalCard>
                  
                  <TerminalCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.fixedCount}</p>
                        <p className="text-sm text-muted-foreground">Fixed</p>
                      </div>
                    </div>
                  </TerminalCard>
                  
                  <TerminalCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.ignoredCount}</p>
                        <p className="text-sm text-muted-foreground">Ignored</p>
                      </div>
                    </div>
                  </TerminalCard>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TerminalCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.totalOccurrences}</p>
                        <p className="text-sm text-muted-foreground">Total Occurrences</p>
                      </div>
                    </div>
                  </TerminalCard>
                  
                  <TerminalCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Users className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                        <p className="text-sm text-muted-foreground">Affected Users</p>
                      </div>
                    </div>
                  </TerminalCard>
                  
                  <TerminalCard className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Calendar className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.last24h}</p>
                        <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                      </div>
                    </div>
                  </TerminalCard>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Error Types Breakdown */}
                  <TerminalCard className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Errors by Type
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm">
                            {errorTypeLabels[type as ErrorType] || type}
                          </span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 bg-primary rounded"
                              style={{ width: `${(count / stats.total) * 100}px` }}
                            />
                            <span className="text-sm font-mono text-muted-foreground w-8">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TerminalCard>
                  
                  {/* Top Routes */}
                  <TerminalCard className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Top Routes with Errors
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(stats.byRoute)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([route, count]) => (
                          <div key={route} className="flex items-center justify-between">
                            <span className="text-sm font-mono truncate max-w-[200px]">
                              {route}
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </TerminalCard>
                </div>
                
                {/* Most Frequent Errors */}
                <TerminalCard className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Most Frequent Errors
                  </h3>
                  <div className="space-y-3">
                    {stats.topErrors.map((error, idx) => (
                      <div 
                        key={error.id} 
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => {
                          setSelectedError(error);
                          setActiveTab('errors');
                        }}
                      >
                        <span className="text-lg font-bold text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm truncate">{error.error_message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {error.occurrence_count} occurrences • {error.route || 'Unknown route'}
                          </p>
                        </div>
                        <Badge className={statusConfig[error.status as ErrorStatus]?.color}>
                          {statusConfig[error.status as ErrorStatus]?.label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TerminalCard>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="errors" className="space-y-4 mt-6">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <TerminalInput
                    placeholder="Search errors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Error Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="js_error">JavaScript Error</SelectItem>
                  <SelectItem value="promise_rejection">Promise Rejection</SelectItem>
                  <SelectItem value="react_boundary">React Crash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-2">
                  <TerminalButton
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: 'investigating' })}
                  >
                    Mark Investigating
                  </TerminalButton>
                  <TerminalButton
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: 'fixed' })}
                  >
                    Mark Fixed
                  </TerminalButton>
                  <TerminalButton
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateMutation.mutate({ ids: Array.from(selectedIds), status: 'ignored' })}
                  >
                    Mark Ignored
                  </TerminalButton>
                  <TerminalButton
                    size="sm"
                    variant="destructive"
                    onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </TerminalButton>
                </div>
              </div>
            )}
            
            {/* Error List */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredErrors.length === 0 ? (
              <TerminalCard className="p-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h2 className="text-xl font-semibold mb-2">No errors found</h2>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'Your app is running smoothly!'}
                </p>
              </TerminalCard>
            ) : (
              <div className="space-y-2">
                {/* Select All */}
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={selectedIds.size === filteredErrors.length && filteredErrors.length > 0}
                    onCheckedChange={selectAll}
                  />
                  <span>
                    {filteredErrors.length} error{filteredErrors.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {filteredErrors.map((error) => {
                  const status = error.status as ErrorStatus;
                  const StatusIcon = statusConfig[status]?.icon || AlertTriangle;
                  
                  return (
                    <TerminalCard
                      key={error.id}
                      className="p-4 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(error.id)}
                          onCheckedChange={() => toggleSelection(error.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setSelectedError(error)}
                        >
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={statusConfig[status]?.color || ''}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[status]?.label || status}
                            </Badge>
                            <Badge variant="outline">
                              {errorTypeLabels[error.error_type as ErrorType] || error.error_type}
                            </Badge>
                            {error.occurrence_count > 1 && (
                              <Badge variant="secondary">
                                ×{error.occurrence_count}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="font-mono text-sm text-foreground line-clamp-2">
                            {error.error_message}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span title={format(new Date(error.created_at), 'PPpp')}>
                              {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                            </span>
                            {error.route && (
                              <span className="font-mono">{error.route}</span>
                            )}
                          </div>
                        </div>
                        
                        <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </TerminalCard>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Error Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4 overflow-hidden flex flex-col flex-1">
              {/* Status Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Status:</span>
                {(['new', 'investigating', 'fixed', 'ignored'] as ErrorStatus[]).map((status) => (
                  <TerminalButton
                    key={status}
                    size="sm"
                    variant={selectedError.status === status ? 'default' : 'outline'}
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedError.id, status });
                      setSelectedError({ ...selectedError, status });
                    }}
                  >
                    {statusConfig[status].label}
                  </TerminalButton>
                ))}
                <div className="flex-1" />
                <TerminalButton
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(selectedError.fingerprint)}
                  title="Copy fingerprint"
                >
                  <Copy className="h-4 w-4" />
                </TerminalButton>
                <TerminalButton
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedError.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </TerminalButton>
              </div>
              
              {/* Error Info */}
              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold">Error Message</h4>
                      <TerminalButton
                        size="sm"
                        variant="ghost"
                        className="h-6"
                        onClick={() => copyToClipboard(selectedError.error_message)}
                      >
                        <Copy className="h-3 w-3" />
                      </TerminalButton>
                    </div>
                    <p className="font-mono text-sm bg-muted p-3 rounded break-all">
                      {selectedError.error_message}
                    </p>
                  </div>
                  
                  {selectedError.stack_trace && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold">Stack Trace</h4>
                        <TerminalButton
                          size="sm"
                          variant="ghost"
                          className="h-6"
                          onClick={() => copyToClipboard(selectedError.stack_trace || '')}
                        >
                          <Copy className="h-3 w-3" />
                        </TerminalButton>
                      </div>
                      <pre className="font-mono text-xs bg-muted p-3 rounded overflow-auto max-h-48 whitespace-pre-wrap">
                        {selectedError.stack_trace}
                      </pre>
                    </div>
                  )}
                  
                  {selectedError.component_stack && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Component Stack</h4>
                      <pre className="font-mono text-xs bg-muted p-3 rounded overflow-auto max-h-32 whitespace-pre-wrap">
                        {selectedError.component_stack}
                      </pre>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">URL</h4>
                      <p className="text-sm text-muted-foreground break-all font-mono">
                        {selectedError.url || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Route</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedError.route || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">First Occurred</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedError.created_at), 'PPpp')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Last Occurred</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedError.last_occurred_at), 'PPpp')}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Occurrences</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedError.occurrence_count}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Error Type</h4>
                      <p className="text-sm text-muted-foreground">
                        {errorTypeLabels[selectedError.error_type as ErrorType] || selectedError.error_type}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">User ID</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedError.user_id || 'Anonymous'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Fingerprint</h4>
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {selectedError.fingerprint}
                      </p>
                    </div>
                  </div>
                  
                  {selectedError.user_agent && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Browser / Device</h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedError.user_agent}
                      </p>
                    </div>
                  )}
                  
                  {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Additional Context</h4>
                      <pre className="font-mono text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(selectedError.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
