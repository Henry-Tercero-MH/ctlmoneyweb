/**
 * CategoryIcon — mapea el slug guardado en Sheets al ícono Lucide correspondiente.
 * El slug es generado por slugIcon_() en el backend: lowercase, sin tildes, guiones.
 *
 * Uso:  <CategoryIcon slug={cat.icon} size={20} />
 */
import type { LucideProps } from 'lucide-react';
import {
  Home, Utensils, Car, HeartPulse, BookOpen, CreditCard,
  Gamepad2, Shirt, Zap, Rss, Gift, PawPrint,
  AlertTriangle, MoreHorizontal, Briefcase, TrendingUp,
  ShoppingCart, Music, Dumbbell, Scissors, Plane, Fuel,
  Bus, Baby, Coffee, Pizza, Wifi, Phone, Tv, Building2,
  Wallet, Banknote, PiggyBank, Star, Flower2, Leaf,
  Hammer, Wrench, Package, Truck, Globe, Camera, Heart,
} from 'lucide-react';
import type { ComponentType } from 'react';

// ── Mapa slug → componente ──────────────────────────────────────────────────
const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  // Gastos — categorías del seed
  'vivienda':        Home,
  'alimentacion':    Utensils,
  'transporte':      Car,
  'salud':           HeartPulse,
  'educacion':       BookOpen,
  'deudas':          CreditCard,
  'entretenimiento': Gamepad2,
  'ropa':            Shirt,
  'servicios':       Zap,
  'suscripciones':   Rss,
  'regalos':         Gift,
  'mascotas':        PawPrint,
  'imprevistos':     AlertTriangle,
  'otros':           MoreHorizontal,

  // Ingresos — categorías del seed
  'salario':         Wallet,
  'negocio':         Briefcase,
  'freelance':       Laptop,
  'inversiones':     TrendingUp,
  'otros-ingresos':  Banknote,

  // Extras comunes que el usuario puede crear
  'supermercado':    ShoppingCart,
  'musica':          Music,
  'gym':             Dumbbell,
  'belleza':         Scissors,
  'viajes':          Plane,
  'gasolina':        Fuel,
  'transporte-publico': Bus,
  'bebe':            Baby,
  'cafe':            Coffee,
  'restaurante':     Pizza,
  'internet':        Wifi,
  'telefono':        Phone,
  'television':      Tv,
  'oficina':         Building2,
  'ahorro':          PiggyBank,
  'favoritos':       Star,
  'jardin':          Flower2,
  'plantas':         Leaf,
  'reparaciones':    Hammer,
  'mantenimiento':   Wrench,
  'envios':          Package,
  'delivery':        Truck,
  'internacional':   Globe,
  'fotos':           Camera,
  'salud-mental':    Heart,
};

// Lazy import para evitar circular — Laptop no está en el bloque de arriba
import { Laptop } from 'lucide-react';

// ── Lista ordenada para el picker ───────────────────────────────────────────
export const ICON_OPTIONS: { slug: string; Icon: ComponentType<LucideProps> }[] = [
  { slug: 'vivienda',        Icon: Home },
  { slug: 'alimentacion',    Icon: Utensils },
  { slug: 'transporte',      Icon: Car },
  { slug: 'salud',           Icon: HeartPulse },
  { slug: 'educacion',       Icon: BookOpen },
  { slug: 'deudas',          Icon: CreditCard },
  { slug: 'entretenimiento', Icon: Gamepad2 },
  { slug: 'ropa',            Icon: Shirt },
  { slug: 'servicios',       Icon: Zap },
  { slug: 'suscripciones',   Icon: Rss },
  { slug: 'regalos',         Icon: Gift },
  { slug: 'mascotas',        Icon: PawPrint },
  { slug: 'imprevistos',     Icon: AlertTriangle },
  { slug: 'supermercado',    Icon: ShoppingCart },
  { slug: 'musica',          Icon: Music },
  { slug: 'gym',             Icon: Dumbbell },
  { slug: 'belleza',         Icon: Scissors },
  { slug: 'viajes',          Icon: Plane },
  { slug: 'gasolina',        Icon: Fuel },
  { slug: 'cafe',            Icon: Coffee },
  { slug: 'restaurante',     Icon: Pizza },
  { slug: 'internet',        Icon: Wifi },
  { slug: 'telefono',        Icon: Phone },
  { slug: 'television',      Icon: Tv },
  { slug: 'oficina',         Icon: Building2 },
  { slug: 'ahorro',          Icon: PiggyBank },
  { slug: 'favoritos',       Icon: Star },
  { slug: 'jardin',          Icon: Flower2 },
  { slug: 'reparaciones',    Icon: Hammer },
  { slug: 'mantenimiento',   Icon: Wrench },
  { slug: 'envios',          Icon: Package },
  { slug: 'delivery',        Icon: Truck },
  { slug: 'internacional',   Icon: Globe },
  { slug: 'fotos',           Icon: Camera },
  { slug: 'salud-mental',    Icon: Heart },
  { slug: 'salario',         Icon: Wallet },
  { slug: 'negocio',         Icon: Briefcase },
  { slug: 'freelance',       Icon: Laptop },
  { slug: 'inversiones',     Icon: TrendingUp },
  { slug: 'otros-ingresos',  Icon: Banknote },
  { slug: 'otros',           Icon: MoreHorizontal },
];

// ── Componente ───────────────────────────────────────────────────────────────
interface CategoryIconProps extends LucideProps {
  slug: string;
}

export function CategoryIcon({ slug, size = 18, strokeWidth = 1.75, ...rest }: CategoryIconProps) {
  const Icon = ICON_MAP[slug] ?? MoreHorizontal;
  return <Icon size={size} strokeWidth={strokeWidth} {...rest} />;
}
