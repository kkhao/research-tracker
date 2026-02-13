import wishes from "@/data/wishes.json";

export default function Wishboard() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {wishes.map((wish) => (
        <li
          key={wish.id}
          className="rounded-2xl bg-white/95 border-2 border-rose-200/60 p-5 shadow-lg hover:border-rose-300 hover:shadow-xl transition-all"
        >
          <div className="text-3xl mb-2">{wish.icon}</div>
          <h3 className="font-semibold text-rose-800 text-lg">{wish.title}</h3>
          {wish.description && (
            <p className="text-rose-600 text-sm mt-1">{wish.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
