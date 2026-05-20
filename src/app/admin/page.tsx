
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Симуляция: В реальном приложении здесь будет проверка на стороне сервера
    if (password === 'admin123') {
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 500);
    } else {
      toast({
        variant: 'destructive',
        title: 'Ошибка аутентификации',
        description: 'Неверный административный пароль.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_#7D61EA_0%,_transparent_50%)]" />
      </div>

      <Card className="w-full max-w-md border-border bg-[#141217]">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Доступ в Матрицу</CardTitle>
          <CardDescription>Введите защитный код для управления системой go2study.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Пароль администратора</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-12 bg-secondary border-border"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={loading}>
              {loading ? 'Проверка...' : 'Открыть Дашборд'}
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t">
              <ShieldAlert className="w-4 h-4" />
              Доступ ограничен для неавторизованных лиц.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
