import ShaderShowcase from "@/components/ui/hero";

// Pedido del usuario: reemplazo del Hero anterior (dos columnas, paleta
// Custodiado — ver historial de `Hero.tsx`) por este componente de shader
// animado (`ShaderShowcase`, `components/ui/hero.tsx`), integrado tal cual
// se pidió. OJO: trae su propio `<header>` (logo + nav "Features/Pricing/
// Docs" + botón "Login") y copy en inglés genérico de demo — queda
// duplicado con el `Navbar` real que ya renderiza `app/page.tsx` justo
// arriba, y el texto no es el de Custodiado. Swap literal a propósito;
// falta adaptar copy/CTAs y decidir qué hacer con ese header interno.
export default function Hero() {
  return <ShaderShowcase />;
}
