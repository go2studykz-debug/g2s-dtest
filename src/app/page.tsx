
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, Brain, ShieldCheck, ArrowRight, User, Phone } from 'lucide-react';
import { startTest } from './lib/actions';
import { useToast } from '@/hooks/use-toast';

const CITIES = [
  "Астана", "Алматы", "Павлодар", "Актау", "Актобе", "Атырау", 
  "Караганда", "Кокшетау", "Костанай", "Кызылорда", 
  "Петропавловск", "Семей", "Талдыкорган", "Тараз", 
  "Туркестан", "Уральск", "Усть-Каменогорск", "Шымкент"
];

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    whatsapp: '+77',
    classNumber: '4',
    language: 'ru',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пожалуйста, выберите город.' });
      return;
    }
    setLoading(true);
    try {
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
        title: 'Ошибка',
        description: 'Не удалось начать тест. Попробуйте еще раз.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        <div className="space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm">
            <Rocket className="w-4 h-4" />
            <span>Тестирование нового поколения</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-headline font-bold leading-tight">
            Раскрой свой <span className="text-primary">потенциал</span> с go2study
          </h1>
          
          <p className="text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
            Интеллектуальная диагностическая платформа, созданная для выявления ваших сильных сторон и построения пути к успеху.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-secondary border border-border">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Анализ</h3>
                <p className="text-sm text-muted-foreground">Персонализированная обратная связь по каждой ошибке.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-secondary border border-border">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Защита Proctor</h3>
                <p className="text-sm text-muted-foreground">Встроенная система контроля честности тестирования.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="glass-morphism border-none shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-headline">Регистрация</CardTitle>
            <CardDescription>Введите свои данные, чтобы начать диагностический тест.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">ФИО Ученика</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    placeholder="Иван Иванов" 
                    className="pl-10" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Город НИШ</Label>
                  <Select 
                    value={formData.city}
                    onValueChange={val => setFormData({...formData, city: val})}
                  >
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Выберите город" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp номер родителя</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="whatsapp" 
                      placeholder="+7 77x xxx xx xx" 
                      className="pl-10"
                      required 
                      value={formData.whatsapp}
                      onChange={e => {
                        let val = e.target.value;
                        if (!val.startsWith('+77')) val = '+77';
                        setFormData({...formData, whatsapp: val});
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Класс обучения</Label>
                  <Select 
                    value={formData.classNumber} 
                    onValueChange={val => setFormData({...formData, classNumber: val})}
                  >
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Выберите класс" />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 5, 6].map(c => (
                        <SelectItem key={c} value={c.toString()}>{c} Класс</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Язык теста</Label>
                  <Select 
                    value={formData.language}
                    onValueChange={val => setFormData({...formData, language: val})}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Язык" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kk">Казахский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 transition-all" disabled={loading}>
                {loading ? 'Инициализация...' : 'Начать диагностику'}
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="absolute bottom-8 text-muted-foreground text-sm flex gap-6">
        <button onClick={() => router.push('/admin')} className="hover:text-primary transition-colors">Admin Matrix</button>
        <span>&copy; 2024 go2study Diagnostic Systems</span>
      </footer>
    </div>
  );
}
