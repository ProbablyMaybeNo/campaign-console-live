import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { TerminalCard } from "@/components/ui/TerminalCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertTriangle, 
  Bug, 
  CheckCircle, 
  Clock, 
  Eye, 
  EyeOff,
  RefreshCw,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
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
  const [selectedError, setSelectedError] = useState<ErrorReport | null>(null);
  
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
  
  // Fetch error reports
  const { data: errors, isLoading, refetch } = useQuery({
    queryKey: ['error-reports', statusFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('error_type', typeFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ErrorReport[];
    },
    enabled: isAdmin === true,
  });
  
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
      queryClient.invalidateQueries({ queryKey: ['error-reports'] });
      toast({ title: 'Status updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['error-reports'] });
      setSelectedError(null);
      toast({ title: 'Error report deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    },
  });
  
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
                Error Reports
              </h1>
              <p className="text-muted-foreground text-sm">
                {errors?.length || 0} reports
              </p>
            </div>
          </div>
          
          <TerminalButton onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </TerminalButton>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4">
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
        
        {/* Error List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : errors?.length === 0 ? (
          <TerminalCard className="p-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">No errors found</h2>
            <p className="text-muted-foreground">Your app is running smoothly!</p>
          </TerminalCard>
        ) : (
          <div className="space-y-3">
            {errors?.map((error) => {
              const status = error.status as ErrorStatus;
              const StatusIcon = statusConfig[status]?.icon || AlertTriangle;
              
              return (
                <TerminalCard
                  key={error.id}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedError(error)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
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
                      
                      <p className="font-mono text-sm text-foreground truncate">
                        {error.error_message}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(error.created_at), 'MMM d, HH:mm')}</span>
                        {error.route && <span>{error.route}</span>}
                      </div>
                    </div>
                    
                    <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </TerminalCard>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4 overflow-hidden flex flex-col flex-1">
              {/* Status Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Set status:</span>
                {(['new', 'investigating', 'fixed', 'ignored'] as ErrorStatus[]).map((status) => (
                  <TerminalButton
                    key={status}
                    size="sm"
                    variant={selectedError.status === status ? 'default' : 'outline'}
                    onClick={() => updateStatusMutation.mutate({ id: selectedError.id, status })}
                  >
                    {statusConfig[status].label}
                  </TerminalButton>
                ))}
                <div className="flex-1" />
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
                    <h4 className="text-sm font-semibold mb-1">Error Message</h4>
                    <p className="font-mono text-sm bg-muted p-3 rounded">
                      {selectedError.error_message}
                    </p>
                  </div>
                  
                  {selectedError.stack_trace && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Stack Trace</h4>
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
                      <p className="text-sm text-muted-foreground break-all">
                        {selectedError.url || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Route</h4>
                      <p className="text-sm text-muted-foreground">
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
                      <h4 className="text-sm font-semibold mb-1">User ID</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedError.user_id || 'Anonymous'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedError.user_agent && (
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Browser</h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedError.user_agent}
                      </p>
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
