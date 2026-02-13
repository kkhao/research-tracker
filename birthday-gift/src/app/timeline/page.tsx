import NavBack from "@/components/NavBack";
import Timeline from "@/components/Timeline";

export default function TimelinePage() {
  return (
    <main className="min-h-screen py-10 px-4 max-w-3xl mx-auto">
      <NavBack />
      <h1 className="text-2xl font-bold text-rose-800 mb-2">我们的时光</h1>
      <p className="text-rose-600 mb-8">从相识到如今，每一个重要时刻</p>
      <Timeline />
    </main>
  );
}
