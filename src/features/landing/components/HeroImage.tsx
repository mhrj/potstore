import Image from "next/image";

type HeroImageProps = {
  className?: string;
};

export default function HeroImage({ className = "" }: HeroImageProps) {
  return (
    <div
      className={`w-full max-w-[500px] lg:max-w-[800px] mx-auto flex items-center justify-center bg-transparent pointer-events-none select-none ${className}`}
    >
      <Image
        src="/images/botanical-sketch.png"
        alt="طراحی گیاه‌شناسی و گلدان پات استور"
        width={800}
        height={600}
        priority
        className="w-full h-auto object-contain max-w-[500px] lg:max-w-[800px] mx-auto"
      />
    </div>
  );
}
