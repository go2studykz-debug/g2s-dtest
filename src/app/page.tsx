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
  GraduationCap, BookOpen, CheckCircle2, User, Phone, 
  Target, HeartHandshake, FileSearch, Sparkles, ExternalLink, ArrowRight, BrainCircuit
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
    stats_students: "NIS Standard",
    stats_params: "7 предметов",
    stats_cities: "120 минут",
    how_title: "Как строится ваш успех",
    how_step1: "Регистрация",
    how_step1_desc: "Мгновенный доступ к системе",
    how_step2: "Диагностика",
    how_step2_desc: "Глубокий аудит знаний (до 120 мин)",
    how_step3: "Экспертный разбор",
    how_step3_desc: "Анализ от экспертов (отправим вам)",
    how_step4: "Сопровождение",
    how_step4_desc: "Ведем вас до самого поступления",
    preview_title: "Что вы получите",
    preview_summary: "Результаты диагностики от go2study — это фундамент, без которого нельзя строить подготовку. Мы выявим ваши 'слепые зоны' и превратим их в точки роста.",
    go2site: "о go2study",
    value_1: "Анализ влияния каждой ошибки на экзамен",
    value_2: "Типизация ошибок и персональные рекомендации",
    value_3: "Карта навыков по всем предметам НИШ"
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
    stats_students: "NIS Standard",
    stats_params: "7 пән",
    stats_cities: "120 минут",
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
    preview_summary: "go2study диагностикасының нәтижелері — бұл дайындықтың негізі. Біз 'әлсіз тұстарды' анықтап, оларды өсу нүктелеріне айналдырамыз.",
    go2site: "go2study туралы",
    value_1: "Әрбір қатенің емтиханға әсерін талдау",
    value_2: "Қателерді жүйелеу және жеке ұсыныстар",
    value_3: "НЗМ-нің барлық пәндері бойынша дағдылар картасы"
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
        description: lang === 'ru' ? 'Введите полный номер телефона (11 цифр).' : 'Толық телефон нөмірін енгізіңіз (11 цифр).'
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
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to start test.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const isDeleting = input.length < formData.whatsapp.length;
    if (!input) { setFormData(prev => ({ ...prev, whatsapp: '' })); return; }
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
      <header className="w-full bg-white border-b border-[#e3e8ee] py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight text-[#081d3a]">go<span className="text-primary">2</span>study</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://go2study.kz/" target="_blank" className="text-[10px] font-black text-[#081d3a]/40 uppercase tracking-widest hover:text-primary flex items-center gap-1.5 transition-colors">
            <ExternalLink className="w-3 h-3" /> {t.go2site}
          </a>
          <div className="flex bg-muted p-1 rounded-lg">
            <button onClick={() => setLang('ru')} className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", lang === 'ru' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}>RU</button>
            <button onClick={() => setLang('kk')} className={cn("px-3 py-1 text-xs font-bold rounded-md transition-all", lang === 'kk' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}>KK</button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="space-y-8 order-2 lg:order-1">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1 font-bold text-sm uppercase tracking-wider">Профессиональная диагностика НИШ</Badge>
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-[#081d3a] leading-[1.15]">
              {t.hero_title.split('. ')[0]}. <br/><span className="text-primary">{t.hero_title.split('. ')[1]}</span>
            </h1>
            <p className="text-lg md:text-xl text-[#3b3e40] leading-relaxed max-w-lg opacity-80 font-medium">{t.hero_subtitle}</p>
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="flex flex-col"><span className="text-2xl font-bold text-[#081d3a]">{t.stats_students}</span><span className="text-[10px] font-black uppercase text-[#3b3e40]/40 tracking-widest">Академичность</span></div>
              <div className="flex flex-col"><span className="text-2xl font-bold text-primary">{t.stats_params}</span><span className="text-[10px] font-black uppercase text-[#3b3e40]/40 tracking-widest">Охват тем</span></div>
              <div className="flex flex-col"><span className="text-2xl font-bold text-[#081d3a]">{t.stats_cities}</span><span className="text-[10px] font-black uppercase text-[#3b3e40]/40 tracking-widest">Глубина аудита</span></div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Card className="border border-[#e3e8ee] shadow-2xl rounded-3xl overflow-hidden bg-white">
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
                      <Input placeholder={lang === 'ru' ? "Алия Смагулова" : "Әлия Смағұлова"} className="pl-11 h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl focus:ring-primary" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_city}</Label>
                      <Select value={formData.city} onValueChange={val => setFormData({...formData, city: val})}>
                        <SelectTrigger className="h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl"><SelectValue placeholder={lang === 'ru' ? "Выбрать" : "Таңдау"} /></SelectTrigger>
                        <SelectContent>{CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}</SelectContent>
                      </Select>
                      <p className="text-[9px] text-[#3b3e40]/60 italic font-bold leading-tight px-1">{t.field_city_hint}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_whatsapp}</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 w-4 h-4 text-primary" />
                        <Input placeholder="+7 7XX XXX XX XX" className="pl-11 h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl focus:ring-primary" required value={formData.whatsapp} onChange={handlePhoneChange} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_class}</Label>
                      <Select value={formData.classNumber} onValueChange={val => setFormData({...formData, classNumber: val})}><SelectTrigger className="h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{[4, 5, 6].map(c => <SelectItem key={c} value={c.toString()}>{c} {lang === 'ru' ? 'Класс' : 'Сынып'}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-[#081d3a]/40 tracking-widest">{t.field_lang}</Label>
                      <Select value={formData.language} onValueChange={val => setFormData({...formData, language: val})}><SelectTrigger className="h-12 bg-[#f8fafc] border-[#e3e8ee] rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ru">Русский</SelectItem><SelectItem value="kk">Қазақша</SelectItem></SelectContent></Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg rounded-xl animate-pulse-cta" disabled={loading}>{loading ? '...' : t.btn_start}{!loading && <ArrowRight className="ml-2 w-5 h-5" />}</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

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
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", step.bg)}><step.icon className={cn("w-8 h-8", step.color)} /></div>
                <h3 className="font-bold text-xl text-[#081d3a]">{step.title}</h3>
                <p className="text-sm text-[#3b3e40] opacity-60 font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="py-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center bg-white rounded-[40px] p-8 md:p-16 border border-border/50 shadow-sm overflow-hidden relative">
          <div className="space-y-6">
            <Badge className="bg-primary/10 text-primary border-none px-4 py-1 font-bold">Deep Analytic Report</Badge>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-[#081d3a] leading-tight">{t.preview_title}</h2>
            <p className="text-lg text-[#3b3e40] opacity-80 leading-relaxed font-medium">{t.preview_summary}</p>
            <ul className="space-y-4 pt-2">
              {[t.value_1, t.value_2, t.value_3].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-[#081d3a] text-sm"><CheckCircle2 className="w-5 h-5 text-primary" /> {item}</li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <Card className="border-border/50 shadow-2xl rounded-2xl overflow-hidden bg-white scale-95 md:scale-100 max-w-sm mx-auto">
              <CardHeader className="bg-[#081d3a] py-6 px-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /><span className="text-sm font-bold text-white lowercase">go2study</span></div>
                  <Badge className="bg-primary text-white text-[8px] border-none uppercase font-black">Official Analysis</Badge>
                </div>
                <h4 className="text-lg font-bold font-headline text-white">Аналитический отчет НИШ</h4>
              </CardHeader>
              <CardContent className="p-6 space-y-4 bg-white">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Анализ ошибки #26</p>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div><p className="opacity-50 uppercase">Тема:</p><p className="font-bold">Поиск информации</p></div>
                    <div><p className="opacity-50 uppercase">Тип:</p><p className="font-bold">Невнимательность</p></div>
                  </div>
                  <div className="pt-2 border-t border-primary/10">
                    <p className="text-[9px] opacity-50 uppercase">Влияние на экзамен:</p>
                    <p className="text-[9px] font-medium italic leading-snug">"Самый частый тип вопросов в блоке языка. Критичен для высокого балла."</p>
                  </div>
                  <div className="pt-2 bg-orange-50 p-2 rounded border border-orange-100">
                    <p className="text-[9px] font-black text-orange-600 uppercase">Рекомендация:</p>
                    <p className="text-[10px] font-medium leading-relaxed italic text-[#081d3a]">Тренировать поиск по ключевым словам вопроса.</p>
                  </div>
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
              <span className="text-xl font-bold text-[#081d3a] lowercase">go<span className="text-primary">2</span>study</span>
            </div>
            <p className="text-[#3b3e40] text-sm opacity-60 font-medium">© 2024 go2study. Миссия: дать каждому ученику шанс на успех.</p>
          </div>
          <div className="flex flex-col gap-3 text-center md:text-right">
            <span className="text-xs font-black uppercase tracking-widest text-[#081d3a] opacity-30">Контакты</span>
            <span className="text-sm font-bold text-[#081d3a]/60">+7 775 389 72 33</span>
            <span className="text-sm font-bold text-[#081d3a]/60 lowercase">info@go2study.kz</span>
            <button onClick={() => router.push('/admin')} className="text-[10px] font-bold opacity-30 uppercase tracking-widest hover:opacity-100 transition-opacity">админ-панель</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
