
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, BookOpen, ShieldCheck, ArrowRight, User, Phone } from 'lucide-react';
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
    whatsapp: '',
    classNumber: '4',
    language: 'ru',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пожалуйста, выберите город.' });
      return;
    }
    
    // Проверка корректности номера (11 цифр в формате +7 7XX XXX XX XX)
    const digitsOnly = formData.whatsapp.replace(/\D/g, '');
    if (digitsOnly.length !== 11) {
      toast({ 
        variant: 'destructive', 
        title: 'Неверный формат', 
        description: 'Пожалуйста, введите полный номер телефона (11 цифр).' 
      });
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const isDeleting = input.length < formData.whatsapp.length;

    if (!input) {
      setFormData(prev => ({ ...prev, whatsapp: '' }));
      return;
    }

    // Если идет удаление, позволяем пользователю стирать символы свободно
    if (isDeleting) {
      setFormData(prev => ({ ...prev, whatsapp: input }));
      return;
    }

    // Оставляем только цифры
    let digits = input.replace(/\D/g, '');

    // Если первая цифра 8, меняем на 7
    if (digits.startsWith('8')) {
      digits = '7' + digits.substring(1);
    }
    
    // Если вводят без 7, добавляем её (кроме случая когда поле пустое)
    if (digits.length > 0 && !digits.startsWith('7')) {
      digits = '7' + digits;
    }

    // Ограничиваем 11 цифрами
    digits = digits.substring(0, 11);

    // Форматирование: +7 7XX XXX XX XX
    let formatted = '';
    if (digits.length > 0) {
      formatted += '+7';
      if (digits.length > 1) {
        const rest = digits.substring(1);
        if (rest.length > 0) formatted += ' ' + rest.substring(0, 3);
        if (rest.length > 3) formatted += ' ' + rest.substring(3, 6);
        if (rest.length > 6) formatted += ' ' + rest.substring(6, 8);
        if (rest.length > 8) formatted += ' ' + rest.substring(8, 10);
      }
    }

    setFormData(prev => ({ ...prev, whatsapp: formatted }));
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center">
      {/* Navbar Style Header */}
      <header className="w-full bg-white border-b border-[#e3e8ee] py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-[#14bf96]" />
          <span className="text-2xl font-bold tracking-tight text-[#081d3a]">
            go<span className="text-[#14bf96]">2</span>study
          </span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-bold text-[#081d3a]/70 uppercase tracking-wide">
          <button className="hover:text-[#14bf96] transition-colors">О платформе</button>
          <button className="hover:text-[#14bf96] transition-colors">Для школ</button>
          <button onClick={() => router.push('/admin')} className="hover:text-[#14bf96] transition-colors">Вход для учителей</button>
        </nav>
      </header>

      <main className="w-full max-w-6xl px-6 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <h1 className="text-4xl md:text-6xl font-headline font-bold text-[#081d3a] leading-[1.1]">
            Для каждого ученика. <br/>Для каждого <span className="text-[#14bf96]">будущего</span>.
          </h1>
          
          <p className="text-lg md:text-xl text-[#3b3e40] leading-relaxed max-w-lg">
            Бесплатная диагностика знаний для поступающих в НИШ. Пойми свои сильные стороны и получи персональный план развития.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#f0f9f7] flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-[#14bf96]" />
              </div>
              <div>
                <h3 className="font-bold text-[#081d3a]">Персонализированное обучение</h3>
                <p className="text-sm text-[#3b3e40]">Анализируем пробелы и даем точные рекомендации.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#f0f9f7] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#14bf96]" />
              </div>
              <div>
                <h3 className="font-bold text-[#081d3a]">Надежные результаты</h3>
                <p className="text-sm text-[#3b3e40]">Система прокторинга гарантирует честность оценки.</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border border-[#e3e8ee] shadow-lg rounded-2xl overflow-hidden bg-white">
          <div className="bg-[#14bf96] h-2 w-full" />
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-bold text-[#081d3a]">Начни сейчас</CardTitle>
            <CardDescription className="text-[#3b3e40]">Заполни анкету, чтобы приступить к тесту.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase text-[#081d3a]/60">ФИО Ученика</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-[#14bf96]" />
                  <Input 
                    id="name" 
                    placeholder="Алия Смагулова" 
                    className="pl-10 h-12 border-[#e3e8ee] focus:border-[#14bf96] focus:ring-1 focus:ring-[#14bf96]" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-bold uppercase text-[#081d3a]/60">Город НИШ</Label>
                  <Select 
                    value={formData.city}
                    onValueChange={val => setFormData({...formData, city: val})}
                  >
                    <SelectTrigger id="city" className="h-12 border-[#e3e8ee]">
                      <SelectValue placeholder="Выбрать" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-xs font-bold uppercase text-[#081d3a]/60">WhatsApp Родителя</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-[#14bf96]" />
                    <Input 
                      id="whatsapp" 
                      placeholder="+7 7XX XXX XX XX" 
                      className="pl-10 h-12 border-[#e3e8ee] focus:border-[#14bf96] focus:ring-1 focus:ring-[#14bf96]"
                      required 
                      value={formData.whatsapp}
                      onChange={handlePhoneChange}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class" className="text-xs font-bold uppercase text-[#081d3a]/60">Класс</Label>
                  <Select 
                    value={formData.classNumber} 
                    onValueChange={val => setFormData({...formData, classNumber: val})}
                  >
                    <SelectTrigger id="class" className="h-12 border-[#e3e8ee]">
                      <SelectValue placeholder="Класс" />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 5, 6].map(c => (
                        <SelectItem key={c} value={c.toString()}>{c} Класс</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-xs font-bold uppercase text-[#081d3a]/60">Язык</Label>
                  <Select 
                    value={formData.language}
                    onValueChange={val => setFormData({...formData, language: val})}
                  >
                    <SelectTrigger id="language" className="h-12 border-[#e3e8ee]">
                      <SelectValue placeholder="Язык" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="kk">Казахский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-lg font-bold bg-[#14bf96] hover:bg-[#11a381] shadow-md" disabled={loading}>
                {loading ? 'Загрузка...' : 'Начать диагностику'}
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="w-full border-t border-[#e3e8ee] bg-white py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#14bf96]" />
            <span className="text-xl font-bold text-[#081d3a]">go2study</span>
          </div>
          <p className="text-[#3b3e40] text-sm">&copy; 2024 go2study. Миссия: дать каждому ученику шанс на успех.</p>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="text-sm font-bold text-[#081d3a]/60 hover:text-[#14bf96]">Панель управления</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
