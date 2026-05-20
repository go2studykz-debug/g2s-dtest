
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, BarChart3, Shield, Search, Filter, 
  ArrowUpRight, BrainCircuit, Activity
} from 'lucide-react';
import { getAllResults, analyzeResult } from '@/app/lib/actions';
import { StudentResult } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const data = await getAllResults();
      setResults(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleAnalyze = async (id: string) => {
    toast({ title: 'AI Analysis Started', description: 'Computing error patterns...' });
    try {
      await analyzeResult(id);
      const updated = await getAllResults();
      setResults(updated);
      toast({ title: 'Success', description: 'AI analysis generated successfully.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'AI analysis failed' });
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-bold">Admin Matrix</h1>
          <p className="text-muted-foreground">Monitor real-time session performance and diagnostic results.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
          <Button><Search className="w-4 h-4 mr-2" /> Quick Search</Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Sessions', val: results.filter(r => r.status === 'in_progress').length, icon: Activity, color: 'text-primary' },
          { label: 'Completed Tests', val: results.filter(r => r.status === 'completed').length, icon: Users, color: 'text-green-500' },
          { label: 'Avg. Score', val: '74%', icon: BarChart3, color: 'text-accent' },
          { label: 'Integrity Alerts', val: results.reduce((acc, r) => acc + r.anti_cheat_count, 0), icon: Shield, color: 'text-destructive' },
        ].map((stat, i) => (
          <Card key={i} className="bg-secondary/50 border-border">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold font-headline mt-1">{stat.val}</p>
              </div>
              <div className={`p-3 rounded-xl bg-background border border-border ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Table */}
      <Card className="border-border bg-secondary/20">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Student Performance Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Integrity</TableHead>
                  <TableHead>AI Insight</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No active records found in the system.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{r.student_name}</span>
                          <span className="text-xs text-muted-foreground">{r.class_number} Class | {r.language.toUpperCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.student_city}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{r.total_score} pts</span>
                          <span className="text-xs text-muted-foreground">({r.percentage}%)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(r.status)}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.anti_cheat_count > 0 ? (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                            {r.anti_cheat_count} Alerts
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <Shield className="w-3 h-3 text-green-500" /> Secure
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.is_analysed ? (
                          <Badge className="bg-accent/10 text-accent border-accent/20">
                            Ready
                          </Badge>
                        ) : r.status === 'completed' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleAnalyze(r.id)} className="text-accent hover:text-accent hover:bg-accent/10 h-7 text-xs">
                            <BrainCircuit className="w-3 h-3 mr-1" /> Generate
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Pending Finish</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/results/${r.id}`)}>
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
