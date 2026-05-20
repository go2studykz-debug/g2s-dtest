
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Brain, ShieldCheck, ArrowRight, User } from 'lucide-react';
import { startTest } from './lib/actions';
import { useToast } from '@/hooks/use-toast';

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    whatsapp: '',
    classNumber: '9',
    language: 'ru',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Using test-1 as default for demo
      const { result } = await startTest({
        testId: 'test-1',
        ...formData,
        classNumber: parseInt(formData.classNumber),
        language: formData.language as 'kk' | 'ru',
      });
      router.push(`/test/${result.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to initialize test. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
            <Rocket className="w-4 h-4" />
            <span>Next Generation Testing</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-headline font-bold leading-tight">
            Master Your <span className="text-primary">Potential</span> with ExamIQ
          </h1>
          
          <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
            An intelligent diagnostic platform designed to uncover your strengths and provide a data-driven path to academic excellence.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-secondary border border-border">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">Personalized feedback on every mistake.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-secondary border border-border">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Proctor Guard</h3>
                <p className="text-sm text-muted-foreground">Advanced anti-cheat protection built-in.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="glass-morphism border-none shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-headline">Registration</CardTitle>
            <CardDescription>Enter your details to begin the diagnostic test.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    className="pl-10" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    placeholder="Almaty" 
                    required 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input 
                    id="whatsapp" 
                    placeholder="+7 707 ..." 
                    required 
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Grade (Class)</Label>
                  <Select 
                    value={formData.classNumber} 
                    onValueChange={val => setFormData({...formData, classNumber: val})}
                  >
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {[9, 10, 11].map(c => (
                        <SelectItem key={c} value={c.toString()}>{c} Class</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Test Language</Label>
                  <Select 
                    value={formData.language}
                    onValueChange={val => setFormData({...formData, language: val})}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Russian</SelectItem>
                      <SelectItem value="kk">Kazakh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all" disabled={loading}>
                {loading ? 'Initializing...' : 'Start Diagnostic'}
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="absolute bottom-8 text-muted-foreground text-sm flex gap-6">
        <button onClick={() => router.push('/admin')} className="hover:text-primary transition-colors">Admin Matrix</button>
        <span>&copy; 2024 ExamIQ Diagnostic Systems</span>
      </footer>
    </div>
  );
}
