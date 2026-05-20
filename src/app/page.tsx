
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, BookOpen, ShieldCheck, ArrowRight, User, Phone, 
  CheckCircle2, Users, MapPin, BarChart3, Zap, BrainCircuit, MessageSquare, ExternalLink,
  Target, Rocket, HeartHandshake, FileText, FileSearch, Sparkles
} from 'lucide-react';
import { startTest } from './lib/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CITIES = [
  "Астана", "Алматы", "Павлодар", "Актау", "Актобе", "Атырау", 
  "Караганда", "Кокшетау", "Костанай", "Кызылорда", 
  "Петропавловск", "Семей", "Талдыкорган", "Тараз", 
  "Туркестан", "Уральск", "Усть-Каменогорск", "Шымкент"
];

const TRANSLATIONS = {
  ru: {
    hero_title: "Ваш первый шаг к поступлению в НИШ.",
    hero_subtitle: "Глубокая академическая диагностика, которая выявит пробелы, определит сильные стороны и станет фундаментом вашего личного учебного плана.",
    cta_title: "Начать путь",
    cta_desc: "Заполни анкету, чтобы приступить к профессиональному тестированию.",
    field_name: "ФИО Ученика",
    field_city: "Город НИШ",
    field_city_hint: "выберите город ниш в которую хотите поступить",
    field_whatsapp: "WhatsApp Родителя",
    field_class: "Класс",
    field_lang: "Язык теста",
    btn_start: "Запустить диагностику",
    stats_students: "1240+ учеников",
    stats_params: "7 предметов",
    stats_cities: "20 городов",
    how_title: "Как строится ваш успех",
    how_step1: "Регистрация",
    how_step1_desc: "Мгновенный доступ к системе",
    how_step2: "Диагностика",
    how_step2_desc: "Глубокий срез знаний (до 120 мин)",
    how_step3: "Экспертный разбор",
    how_step3_desc: "Анализ от экспертов (отправим вам)",
    how_step4: "Сопровождение",
    how_step4_desc: "Ведем вас до самого поступления",
    preview_title: "Что вы получите",
    preview_summary: "Результаты диагностики — это фундамент, без которого нельзя строить подготовку. Мы выявим ваши 'слепые зоны' и превратим их в точки роста.",
    go2site: "о go2study",
    value_1: "Карта навыков по 7 предметам",
    value_2: "Детальный разбор слабых сторон",
    value_3: "Персональный учебный план развития"
  },
  kk: {
    hero_title: "НЗМ-ге түсу жолындағы алғашқы қадамыңыз.",
    hero_subtitle: "Білімдегі олқылықтарды анықтайтын, күшті жақтарды көрсететін иә жеке оқу жоспарыңыздың негізі болатын терең академиялық диагностика.",
    cta_title: "Жолды бастау",
    cta_desc: "Кәсіби тестілеуді бастау үшін сауалнаманы толтырыңыз.",
    field_name: "Оқушының аты-жөні",
    field_city: "НЗМ қаласы",
    field_city_hint: "оқуға түскіңіз келетін зияткерлік мектеп қаласын таңдаңыз",
    field_whatsapp: "Ата-ананың WhatsApp нөмірі",
    field_class: "Сынып",
    field_lang: "Тест тілі",
    btn_start: "Диагностиканы бастау",
    stats_students: "1240+ оқушы",
    stats_params: "7 пән",
    stats_cities: "20 қала",
    how_title: "Сіздің жетістігіңіз қалай құрылады",
    how_step1: "Тіркелу",
    how_step1_desc: "Жүйеге жылдам қол жеткізу",
    how_step2: "Диагностика",
    how_step2_desc: "Терең білім тексеру (120 мин дейін)",
    how_step3: "Сарапшы талдауы",
    how_step3_desc: "Сарапшылардың талдауы (сізге жібереміз)",
    how_step4: "Қолдау көрсету",
    how_step4_desc: "Оқуға түскенше бірге боламыз",
    preview_title: "Сіз не аласыз",
    preview_summary: "Диагностика нәтижелері — бұл дайындықтың негізі. Біз 'әлсіз тұстарды' анықтап, оларды өсу нүктелеріне айналдырамыз.",
    go2site: "go2study туралы",
    value_1: "7 пән бойынша дағдылар картасы",
    value_2: "Әлсіз тұстарды егжей-тегжейлі талдау",
    value_3: "Жеке оқу және даму жоспары"
  }
};

export default function LandingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'ru' | 'kk'>('ru');
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    whatsapp: '',
    classNumber: '4',
    language: 'ru',
  });

  const t = TRANSLATIONS[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.city) {
      toast({ variant: 'destructive', title: lang === 'ru' ? 'Ошибка' : 'Қате', description: lang === 'ru' ? 'Пожалуйста, выберите город.' : 'Қаланы таңдаңыз.' });
      return;
    }
    
    const digitsOnly = formData.whatsapp.replace(/\D/g, '');
    if (digitsOnly.length !== 11) {
      toast({ 
        variant: 'destructive', 
        title: lang === 'ru' ? 'Неверный формат' : 'Қате формат', 
        description: lang === 'ru' ? 'Пожалуйста, введите полный номер телефона (11 цифр).' : 'Толық телефон нөмірін енгізіңіз (11 цифр).'
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
        title: 'Error',
        description: 'Failed to start test.',
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
    
    let digits = input.replace(/\D/g, '');
    
    if (!isDeleting) {
      if (digits.startsWith('8')) digits = '7' + digits.substring(1);
      if (digits.length > 0 && !digits.startsWith('7')) digits = '7' + digits;
    }
    
    digits = digits.substring(0, 11);

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
      {/* Header */}
      <header className="w-full bg-white border-b border-[#e3e8ee] py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight text-[#081d3a]">
            go<span className="text-primary">2</span>study
          </span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8 text-[10px] font-black text-[#081d3a]/40 uppercase tracking-[0.2em]">
            <a href="https://go2study.kz/" target="_blank" className="hover:text-primary transition-colors flex items-center gap-2">
              <ExternalLink className="w-3 h-3" /> {t.go2site}
            </a>
          </nav>
          <div className="flex bg-muted p-1 rounded-lg">
            <button 
              onClick={() => setLang('ru')}
              className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", lang === 'ru' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
            >
              RU
            </button>
            <button 
              onClick={() => setLang('kk')}
              className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", lang === 'kk' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
            >
              KK
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column: Hero */}
          <div className="space-y-8 order-2 lg:order-1">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 border-none px-4 py-1 font-bold text-sm uppercase tracking-wider">
              Профессиональная диагностика НИШ
            </Badge>
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-[#081d3a] leading-[1.15]">
              {t.hero_title.split('. ')[0]}. <br/>
              <span className="text-primary">{t.hero_title.split('. ')[1]}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#3b3e40] leading-relaxed max-w-lg opacity-80 font-medium">
              {t.hero_subtitle}
            </p>

            {/* Social Proof Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-[#081d3a]">{t.stats_students.split(' ')[0]}</span>
                <span className="text-xs font-black uppercase text-[#3b3e40]/40 tracking-widest">{t.stats_students.split(' ')[1]}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-primary">{t.stats_params.split(' ')[0]}</span>
                <span className="text-xs font-black uppercase text-[#3b3e40]/40 tracking-widest">{t.stats_params.split(' ')[1]}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold text-[#081d3a]">{t.stats_cities.split(' ')[0]}</span>
                <span className="text-xs font-black uppercase text-[#3b3e40]/40 tracking-widest">{t.stats_cities.split(' ')[1]}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="order-1 lg:order-2">
            <Card className="border border-[#e3e8ee] shadow-2xl rounded-3xl overflow-hidden bg-white relative">
              <div className="bg-primary h-2 w-full" />
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-2xl font-bold text-[#081d3a]">{t.cta_title}</CardTitle>
                <CardDescription className="text-[#3b3e40] font-medium">{t.cta_desc}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_name}</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 w-4 h-4 text-primary" />
                      <Input 
                        placeholder={lang === 'ru' ? "Алия Смагулова" : "Әлия Смағұлова"} 
                        className="pl-11 h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl focus:ring-primary" 
                        required 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_city}</Label>
                      <Select value={formData.city} onValueChange={val => setFormData({...formData, city: val})}>
                        <SelectTrigger className="h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl">
                          <SelectValue placeholder={lang === 'ru' ? "Выбрать" : "Таңдау"} />
                        </SelectTrigger>
                        <SelectContent>
                          {CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-[#3b3e40]/60 italic font-bold leading-tight px-1">
                        {t.field_city_hint}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_whatsapp}</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 w-4 h-4 text-primary" />
                        <Input 
                          placeholder="+7 7XX XXX XX XX" 
                          className="pl-11 h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl focus:ring-primary"
                          required 
                          value={formData.whatsapp}
                          onChange={handlePhoneChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_class}</Label>
                      <Select value={formData.classNumber} onValueChange={val => setFormData({...formData, classNumber: val})}>
                        <SelectTrigger className="h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[4, 5, 6].map(c => <SelectItem key={c} value={c.toString()}>{c} {lang === 'ru' ? 'Класс' : 'Сынып'}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_lang}</Label>
                      <Select value={formData.language} onValueChange={val => setFormData({...formData, language: val})}>
                        <SelectTrigger className="h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ru">Русский</SelectItem>
                          <SelectItem value="kk">Қазақша</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg rounded-xl animate-pulse-cta transition-all" disabled={loading}>
                    {loading ? '...' : t.btn_start}
                    {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="py-24 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-[#081d3a]">{t.how_title}</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Target, title: t.how_step1, desc: t.how_step1_desc, color: "text-blue-500", bg: "bg-blue-50" },
              { icon: BookOpen, title: t.how_step2, desc: t.how_step2_desc, color: "text-purple-500", bg: "bg-purple-50" },
              { icon: BrainCircuit, title: t.how_step3, desc: t.how_step3_desc, color: "text-primary", bg: "bg-primary/5" },
              { icon: HeartHandshake, title: t.how_step4, desc: t.how_step4_desc, color: "text-orange-500", bg: "bg-orange-50" }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-4 p-8 rounded-3xl bg-white border border-border/50 hover:shadow-xl transition-all group">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", step.bg)}>
                  <step.icon className={cn("w-8 h-8", step.color)} />
                </div>
                <h3 className="font-bold text-xl text-[#081d3a]">{step.title}</h3>
                <p className="text-sm text-[#3b3e40] opacity-60 font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Report Preview */}
        <div className="py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center bg-white rounded-[40px] p-8 md:p-16 border border-border/50 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="space-y-6 relative">
            <Badge className="bg-primary/10 text-primary border-none px-4 py-1 font-bold">Smart Analysis</Badge>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-[#081d3a] leading-tight">
              {t.preview_title}
            </h2>
            <p className="text-lg text-[#3b3e40] opacity-80 leading-relaxed font-medium">
              {t.preview_summary}
            </p>
            <ul className="space-y-4 pt-2">
              {[t.value_1, t.value_2, t.value_3].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-[#081d3a] text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl blur-2xl" />
            <Card className="border-border/50 shadow-2xl rounded-2xl overflow-hidden bg-white rotate-2 hover:rotate-0 transition-transform duration-500 scale-95 md:scale-100 max-w-sm mx-auto">
              <CardHeader className="bg-[#081d3a] py-6 px-6 text-white relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#14bf96]" />
                    <span className="text-sm font-bold tracking-tight">go2study</span>
                  </div>
                  <Badge className="bg-[#14bf96] hover:bg-[#14bf96] text-white text-[8px] border-none uppercase font-black">Official Report</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Диагностический сертификат</p>
                  <h4 className="text-xl font-bold font-headline">Алия Смагулова</h4>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-[#f8fafc] border border-border/50 flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase text-[#3b3e40]/40 mb-1">Общий результат</span>
                    <span className="text-2xl font-bold text-[#14bf96]">84%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8fafc] border border-border/50 flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase text-[#3b3e40]/40 mb-1">Сынып</span>
                    <span className="text-2xl font-bold text-[#081d3a]">6</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase text-[#081d3a] flex items-center gap-2">
                    <FileSearch className="w-3 h-3 text-[#14bf96]" /> Анализ навыков
                  </h5>
                  <div className="space-y-3">
                    {[
                      { label: "Математическая логика", val: 85, color: "bg-[#14bf96]" },
                      { label: "Критическое мышление", val: 72, color: "bg-[#14bf96]" },
                      { label: "Естествознание", val: 45, color: "bg-orange-400" }
                    ].map((skill, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span>{skill.label}</span>
                          <span>{skill.val}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#f1f3f5] rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all", skill.color)} style={{ width: `${skill.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-dashed border-primary/20 space-y-2">
                  <h5 className="text-[9px] font-black uppercase text-primary flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Вердикт эксперта
                  </h5>
                  <p className="text-[10px] font-medium text-[#081d3a] leading-relaxed italic opacity-80">
                    "Требуется усиление блока естествознания. Рекомендуется повторить темы биологии и химии за 5 класс..."
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-[#14bf96]/20 border-t-[#14bf96] animate-spin" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#e3e8ee] bg-white py-12 mt-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-[#081d3a]">go<span className="text-primary">2</span>study</span>
            </div>
            <p className="text-[#3b3e40] text-sm opacity-60 font-medium">© 2024 go2study. Миссия: дать каждому ученику шанс на успех.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-[#081d3a] opacity-30">Платформа</span>
              <a href="https://go2study.kz/" target="_blank" className="text-sm font-bold text-[#081d3a]/60 hover:text-primary transition-colors lowercase">{t.go2site}</a>
              <button onClick={() => router.push('/admin')} className="text-sm font-bold text-[#081d3a]/60 hover:text-primary transition-colors text-left lowercase tracking-widest">админ-панель</button>
            </div>
            <div className="flex flex-col gap-3 text-center md:text-right">
              <span className="text-xs font-black uppercase tracking-widest text-[#081d3a] opacity-30">Контакты</span>
              <span className="text-sm font-bold text-[#081d3a]/60">+7 775 389 72 33</span>
              <span className="text-sm font-bold text-[#081d3a]/60 lowercase">info@go2study.kz</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
