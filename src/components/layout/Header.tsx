import Image from "next/image";
import Link from "next/link";

export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-soft bg-bg/95 px-4 py-3 backdrop-blur">
      <h1 className="font-heading text-xl text-text">{title}</h1>
      <Link href="/" aria-label="דשבורד">
        <Image src="/logo-mark.png" alt="" width={24} height={34} />
      </Link>
    </header>
  );
}
