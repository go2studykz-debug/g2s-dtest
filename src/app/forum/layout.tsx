import type { Metadata } from 'next';
import { FORUM_EVENT } from './event';

// Метаданные ТОЛЬКО для /forum и /forum/ticket — переопределяют глобальный
// layout (там «Диагностика НИШ»), не затрагивая страницы тестов/результатов.
export const metadata: Metadata = {
  title: `go2study | ${FORUM_EVENT.title}`,
  description: `Форум для родителей о поступлении в НИШ, БИЛ и РФМШ. ${FORUM_EVENT.dateLabel}, ${FORUM_EVENT.place}. Участие бесплатное, регистрация онлайн.`,
  openGraph: {
    title: `go2study | ${FORUM_EVENT.title}`,
    description: `Форум для родителей о поступлении в НИШ, БИЛ и РФМШ. ${FORUM_EVENT.dateLabel}.`,
    images: ['/og-image-cobalt-1200.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `go2study | ${FORUM_EVENT.title}`,
    description: `Форум для родителей о поступлении в НИШ, БИЛ и РФМШ. ${FORUM_EVENT.dateLabel}.`,
    images: ['/og-image-cobalt-1200.jpg'],
  },
};

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
