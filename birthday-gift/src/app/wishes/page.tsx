import NavBack from "@/components/NavBack";
import Wishboard from "@/components/Wishboard";

export default function WishesPage() {
  return (
    <main className="min-h-screen py-10 px-4 max-w-3xl mx-auto">
      <NavBack />
      <h1 className="text-2xl font-bold text-rose-800 mb-2">家庭愿望板</h1>
      <p className="text-rose-600 mb-8">新的一岁，我们一起实现的愿望</p>
      <Wishboard />
    </main>
  );
}
