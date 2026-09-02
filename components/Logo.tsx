import Image from "next/image";

export function Logo({ size = 56 }: { size?: number }) {
  // Tailwind's preflight sets `img { height: auto }`, which fights the
  // explicit width/height props below — pin both via inline style so they
  // win and the image doesn't distort.
  const style = { width: size, height: size };

  return (
    <>
      <Image
        src="/Logo-dark-mode.png"
        alt="KONECTA"
        width={size}
        height={size}
        priority
        style={style}
        className="hidden dark:block rounded-2xl"
      />
      <Image
        src="/logo-normal.png"
        alt="KONECTA"
        width={size}
        height={size}
        priority
        style={style}
        className="block dark:hidden rounded-2xl"
      />
    </>
  );
}
