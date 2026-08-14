import ResultDetails from './ResultDetails';

// Тонкая обёртка-страница. Вся логика — в ResultDetails, который также
// переиспользуется страницей участника (/result/[id]) в режиме readOnly.
export default function AdminResultPage({ params }: { params: Promise<{ id: string }> }) {
  return <ResultDetails params={params} />;
}
