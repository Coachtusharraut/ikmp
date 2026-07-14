import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  GraduationCap,
  Video,
  ClipboardList,
  CalendarDays,
  ShoppingBasket,
  Sparkles,
  ShieldCheck,
  ChefHat,
  Heart,
  Star,
  BookOpen,
  Music,
  Camera,
  Coffee,
  Salad,
  Apple,
  Flame,
  Trophy,
  Target,
  Users,
  MessageCircle,
  Mail,
  Phone,
  Info,
  HelpCircle,
  Settings,
  Bell,
  Bookmark,
  Compass,
  Globe,
  Leaf,
  Zap,
  Circle,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  UtensilsCrossed,
  Dumbbell,
  GraduationCap,
  Video,
  ClipboardList,
  CalendarDays,
  ShoppingBasket,
  Sparkles,
  ShieldCheck,
  ChefHat,
  Heart,
  Star,
  BookOpen,
  Music,
  Camera,
  Coffee,
  Salad,
  Apple,
  Flame,
  Trophy,
  Target,
  Users,
  MessageCircle,
  Mail,
  Phone,
  Info,
  HelpCircle,
  Settings,
  Bell,
  Bookmark,
  Compass,
  Globe,
  Leaf,
  Zap,
  Circle,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name: string | null | undefined): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Circle;
}

export type NavVisibility = "public" | "member" | "coach" | "admin";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  sort_order: number;
  visibility: NavVisibility;
  is_active: boolean;
};
