import Link from "next/link";

export default function NavBack() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-rose-700 hover:text-rose-800 font-medium mb-6"
    >
      ← 返回首页
    </Link>
  );
}
