/** Left-hand KIIT panel shared by the sign-in and sign-up pages. */
export default function AuthBrandPanel({ title, body }) {
  return (
    <section className="relative z-0 overflow-hidden px-6 pb-16 pt-14 md:flex md:min-h-screen md:flex-col md:px-16 md:py-16">
      <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(140deg, #0f4a24 0%, #14632f 50%, #1a8f47 100%)' }} />
      <div className="pointer-events-none absolute -right-32 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-[#1BD15A] opacity-25 blur-[140px]" />

      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white p-1.5">
          <img src="/KIIT-logo-HD.webp" alt="KIIT University" className="h-full w-full object-contain" />
        </span>
        <span className="leading-tight">
          <span className="block text-heading-md text-white">KIIT University</span>
          <span className="block text-body-sm text-white/70">Employee Portal</span>
        </span>
      </div>

      <div className="mt-14 md:mt-auto md:pt-24">
        <h1 className="text-[34px] font-bold leading-[1.18] tracking-[-0.03em] text-white md:text-[48px]">{title}</h1>
        <p className="mt-4 max-w-[46ch] text-body-md text-white/75 md:mt-5 md:text-body-lg">{body}</p>
      </div>

      <p className="mt-auto hidden pt-16 text-body-sm text-white/60 md:block">
        Kalinga Institute of Industrial Technology, Bhubaneswar
      </p>
    </section>
  );
}
