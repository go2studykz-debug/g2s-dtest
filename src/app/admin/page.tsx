
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { loginAdmin } from '@/app/lib/actions';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await loginAdmin(password);
    if (result.success) {
      router.push('/admin/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Ошибка доступа',
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

      <Card className="w-full max-w-md border-border bg-[#141217] shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline font-bold">Матрица go2study</CardTitle>
          <CardDescription>Введите защитный код для доступа к панели управления.</CardDescription>
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
                className="h-12 bg-secondary border-border focus:ring-primary"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={loading}>
              {loading ? 'Проверка...' : 'Войти в систему'}
            </Button>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-4 border-t border-border/50 uppercase tracking-widest">
              <ShieldAlert className="w-3 h-3 text-destructive" />
              Доступ только для авторизованного персонала
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
