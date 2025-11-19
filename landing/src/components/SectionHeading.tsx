type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export default function SectionHeading({ eyebrow, title, subtitle, align = "center" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "text-left max-w-xl"}>
      {eyebrow && <p className="text-sm uppercase tracking-[0.3em] text-brand-100 mb-2">{eyebrow}</p>}
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{title}</h2>
      {subtitle && <p className="text-slate-300 leading-relaxed">{subtitle}</p>}
    </div>
  );
}
